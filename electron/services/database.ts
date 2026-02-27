import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { Project, Todo, Note, ChatMessage, AppSettings } from '../../src/types'

export class DatabaseService {
  private db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.initTables()
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        createdAt TEXT NOT NULL,
        archived INTEGER DEFAULT 0,
        archivedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        text TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        completedAt TEXT,
        createdAt TEXT NOT NULL,
        source TEXT DEFAULT 'manual',
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        suggestedTodos TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `)
    
    this.runMigrations()
  }

  private runMigrations() {
    const tableInfo = this.db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>
    const columns = tableInfo.map(col => col.name)
    
    if (!columns.includes('archived')) {
      this.db.exec(`ALTER TABLE projects ADD COLUMN archived INTEGER DEFAULT 0`)
    }
    if (!columns.includes('archivedAt')) {
      this.db.exec(`ALTER TABLE projects ADD COLUMN archivedAt TEXT`)
    }
  }

  // Projects
  getProjects(): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE archived = 0 ORDER BY createdAt DESC')
    const rows = stmt.all() as Array<{
      id: string
      name: string
      description: string
      createdAt: string
      archived: number
      archivedAt: string | null
    }>
    return rows.map(row => ({
      ...row,
      archived: Boolean(row.archived)
    }))
  }

  getArchivedProjects(): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE archived = 1 ORDER BY archivedAt DESC')
    const rows = stmt.all() as Array<{
      id: string
      name: string
      description: string
      createdAt: string
      archived: number
      archivedAt: string | null
    }>
    return rows.map(row => ({
      ...row,
      archived: Boolean(row.archived)
    }))
  }

  addProject(name: string, description: string): Project {
    const project: Project = {
      id: uuidv4(),
      name,
      description,
      createdAt: new Date().toISOString(),
      archived: false,
      archivedAt: null
    }
    const stmt = this.db.prepare('INSERT INTO projects (id, name, description, createdAt, archived, archivedAt) VALUES (?, ?, ?, ?, ?, ?)')
    stmt.run(project.id, project.name, project.description, project.createdAt, 0, null)
    return project
  }

  archiveProject(id: string): Project {
    const archivedAt = new Date().toISOString()
    const stmt = this.db.prepare('UPDATE projects SET archived = 1, archivedAt = ? WHERE id = ?')
    stmt.run(archivedAt, id)
    
    const getStmt = this.db.prepare('SELECT * FROM projects WHERE id = ?')
    const row = getStmt.get(id) as {
      id: string
      name: string
      description: string
      createdAt: string
      archived: number
      archivedAt: string | null
    }
    return {
      ...row,
      archived: Boolean(row.archived)
    }
  }

  restoreProject(id: string): Project {
    const stmt = this.db.prepare('UPDATE projects SET archived = 0, archivedAt = NULL WHERE id = ?')
    stmt.run(id)
    
    const getStmt = this.db.prepare('SELECT * FROM projects WHERE id = ?')
    const row = getStmt.get(id) as {
      id: string
      name: string
      description: string
      createdAt: string
      archived: number
      archivedAt: string | null
    }
    return {
      ...row,
      archived: Boolean(row.archived)
    }
  }

  deleteProject(id: string): void {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?')
    stmt.run(id)
  }

  // Todos
  getTodos(): Todo[] {
    const stmt = this.db.prepare('SELECT * FROM todos ORDER BY createdAt DESC')
    const rows = stmt.all() as Array<{
      id: string
      projectId: string
      text: string
      completed: number
      completedAt: string | null
      createdAt: string
      source: 'manual' | 'ai'
    }>
    return rows.map(row => ({
      ...row,
      completed: Boolean(row.completed)
    }))
  }

  addTodo(projectId: string, text: string, source: 'manual' | 'ai' = 'manual'): Todo {
    const todo: Todo = {
      id: uuidv4(),
      projectId,
      text,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
      source
    }
    const stmt = this.db.prepare('INSERT INTO todos (id, projectId, text, completed, completedAt, createdAt, source) VALUES (?, ?, ?, ?, ?, ?, ?)')
    stmt.run(todo.id, todo.projectId, todo.text, 0, null, todo.createdAt, todo.source)
    return todo
  }

  toggleTodo(id: string, completed: boolean): Todo {
    const completedAt = completed ? new Date().toISOString() : null
    const stmt = this.db.prepare('UPDATE todos SET completed = ?, completedAt = ? WHERE id = ?')
    stmt.run(completed ? 1 : 0, completedAt, id)
    
    const getStmt = this.db.prepare('SELECT * FROM todos WHERE id = ?')
    const row = getStmt.get(id) as {
      id: string
      projectId: string
      text: string
      completed: number
      completedAt: string | null
      createdAt: string
      source: 'manual' | 'ai'
    }
    return {
      ...row,
      completed: Boolean(row.completed)
    }
  }

  deleteTodo(id: string): void {
    const stmt = this.db.prepare('DELETE FROM todos WHERE id = ?')
    stmt.run(id)
  }

  // Notes
  getNotes(): Note[] {
    const stmt = this.db.prepare('SELECT * FROM notes ORDER BY createdAt DESC')
    return stmt.all() as Note[]
  }

  addNote(projectId: string, content: string): Note {
    const note: Note = {
      id: uuidv4(),
      projectId,
      content,
      createdAt: new Date().toISOString()
    }
    const stmt = this.db.prepare('INSERT INTO notes (id, projectId, content, createdAt) VALUES (?, ?, ?, ?)')
    stmt.run(note.id, note.projectId, note.content, note.createdAt)
    return note
  }

  // Messages
  getMessages(): ChatMessage[] {
    const stmt = this.db.prepare('SELECT * FROM messages ORDER BY timestamp ASC')
    const rows = stmt.all() as Array<{
      id: string
      role: 'user' | 'assistant'
      content: string
      timestamp: string
      suggestedTodos: string | null
    }>
    return rows.map(row => ({
      ...row,
      suggestedTodos: row.suggestedTodos ? JSON.parse(row.suggestedTodos) : undefined
    }))
  }

  saveMessage(message: ChatMessage): void {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO messages (id, role, content, timestamp, suggestedTodos) VALUES (?, ?, ?, ?, ?)')
    stmt.run(
      message.id,
      message.role,
      message.content,
      message.timestamp,
      message.suggestedTodos ? JSON.stringify(message.suggestedTodos) : null
    )
  }

  // Settings
  getSettings(): AppSettings | null {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?')
    const row = stmt.get('app_settings') as { value: string } | undefined
    return row ? JSON.parse(row.value) : null
  }

  saveSettings(settings: AppSettings): void {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    stmt.run('app_settings', JSON.stringify(settings))
  }
}
