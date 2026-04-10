import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const Database: typeof import('better-sqlite3') = require('better-sqlite3')
import { v4 as uuidv4 } from 'uuid'
import { Project, Todo, Note, ChatMessage, AppSettings, Subtask } from '../../src/types'

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

      CREATE TABLE IF NOT EXISTS granola_processed_notes (
        noteId TEXT PRIMARY KEY,
        processedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS granola_pending_reviews (
        id TEXT PRIMARY KEY,
        meetingId TEXT NOT NULL,
        meetingTitle TEXT NOT NULL,
        meetingSummary TEXT NOT NULL,
        todosJson TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY,
        todoId TEXT NOT NULL,
        text TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        completedAt TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (todoId) REFERENCES todos(id) ON DELETE CASCADE
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

    try {
      this.db.exec(`ALTER TABLE todos ADD COLUMN priority TEXT DEFAULT 'medium'`)
    } catch { /* column already exists */ }

    try {
      this.db.exec(`ALTER TABLE projects ADD COLUMN position INTEGER DEFAULT 0`)
      // Set initial positions based on createdAt order
      const rows = this.db.prepare('SELECT id FROM projects ORDER BY createdAt ASC').all() as { id: string }[]
      rows.forEach((row, i) => {
        this.db.prepare('UPDATE projects SET position = ? WHERE id = ?').run(i, row.id)
      })
    } catch { /* column already exists */ }

    // Migrate notes table to allow nullable projectId (standalone notes)
    const notesInfo = this.db.prepare("PRAGMA table_info(notes)").all() as Array<{ name: string; notnull: number }>
    const projectIdCol = notesInfo.find(c => c.name === 'projectId')
    if (projectIdCol && projectIdCol.notnull === 1) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS notes_new (
          id TEXT PRIMARY KEY,
          projectId TEXT,
          content TEXT NOT NULL,
          createdAt TEXT NOT NULL
        );
        INSERT INTO notes_new SELECT id, projectId, content, createdAt FROM notes;
        DROP TABLE notes;
        ALTER TABLE notes_new RENAME TO notes;
      `)
    }

    try {
      this.db.exec(`ALTER TABLE notes ADD COLUMN title TEXT`)
    } catch { /* already exists */ }

    try {
      this.db.exec(`ALTER TABLE notes ADD COLUMN pinned INTEGER DEFAULT 0`)
    } catch { /* already exists */ }

    try {
      this.db.exec(`ALTER TABLE projects ADD COLUMN color TEXT DEFAULT '#64748b'`)
    } catch { /* already exists */ }
  }

  // Projects
  getProjects(): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE archived = 0 ORDER BY position ASC, createdAt DESC')
    const rows = stmt.all() as Array<{
      id: string
      name: string
      description: string
      color: string
      createdAt: string
      archived: number
      archivedAt: string | null
    }>
    return rows.map(row => ({
      ...row,
      color: row.color || '#64748b',
      archived: Boolean(row.archived)
    }))
  }

  getArchivedProjects(): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE archived = 1 ORDER BY archivedAt DESC')
    const rows = stmt.all() as Array<{
      id: string
      name: string
      description: string
      color: string
      createdAt: string
      archived: number
      archivedAt: string | null
    }>
    return rows.map(row => ({
      ...row,
      color: row.color || '#64748b',
      archived: Boolean(row.archived)
    }))
  }

  addProject(name: string, description: string, color: string): Project {
    const { pos } = this.db.prepare('SELECT COALESCE(MAX(position), -1) + 1 as pos FROM projects WHERE archived = 0').get() as { pos: number }
    const project: Project = {
      id: uuidv4(),
      name,
      description,
      color,
      createdAt: new Date().toISOString(),
      archived: false,
      archivedAt: null
    }
    const stmt = this.db.prepare('INSERT INTO projects (id, name, description, color, createdAt, archived, archivedAt, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    stmt.run(project.id, project.name, project.description, project.color, project.createdAt, 0, null, pos)
    return project
  }

  reorderProjects(orderedIds: string[]): void {
    const stmt = this.db.prepare('UPDATE projects SET position = ? WHERE id = ?')
    orderedIds.forEach((id, index) => stmt.run(index, id))
  }

  getOrCreateUncategorizedProject(): Project {
    const existing = this.db.prepare("SELECT * FROM projects WHERE name = 'Uncategorized' AND archived = 0").get() as any
    if (existing) {
      return { ...existing, archived: Boolean(existing.archived), color: existing.color || '#94a3b8' }
    }
    const { pos } = this.db.prepare('SELECT COALESCE(MAX(position), -1) + 1 as pos FROM projects WHERE archived = 0').get() as { pos: number }
    const id = uuidv4()
    const now = new Date().toISOString()
    this.db.prepare('INSERT INTO projects (id, name, description, color, createdAt, archived, archivedAt, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, 'Uncategorized', '', '#94a3b8', now, 0, null, pos
    )
    return { id, name: 'Uncategorized', description: '', color: '#94a3b8', createdAt: now, archived: false, archivedAt: null }
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

  updateProject(id: string, name: string, description: string, color: string): Project {
    this.db.prepare('UPDATE projects SET name = ?, description = ?, color = ? WHERE id = ?').run(name, description, color, id)
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as {
      id: string; name: string; description: string; color: string; createdAt: string; archived: number; archivedAt: string | null
    }
    return { ...row, color: row.color || '#64748b', archived: Boolean(row.archived) }
  }

  deleteProject(id: string): void {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?')
    stmt.run(id)
  }

  // Todos
  getTodos(): Todo[] {
    const stmt = this.db.prepare(`
      SELECT * FROM todos ORDER BY
        CASE WHEN completed = 0 THEN 0 ELSE 1 END,
        createdAt DESC
    `)
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
      priority: 'high' | 'medium' | 'low'
    }
    return {
      ...row,
      completed: Boolean(row.completed)
    }
  }

  updateTodo(id: string, text: string): Todo {
    this.db.prepare('UPDATE todos SET text = ? WHERE id = ?').run(text, id)
    const row = this.db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as any
    return { ...row, completed: Boolean(row.completed) }
  }

  moveTodo(id: string, newProjectId: string): Todo {
    this.db.prepare('UPDATE todos SET projectId = ? WHERE id = ?').run(newProjectId, id)
    const row = this.db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as {
      id: string
      projectId: string
      text: string
      completed: number
      completedAt: string | null
      createdAt: string
      source: 'manual' | 'ai'
      priority: 'high' | 'medium' | 'low'
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

  // Subtasks
  addSubtask(todoId: string, text: string): Subtask {
    const subtask: Subtask = {
      id: uuidv4(),
      todoId,
      text,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString()
    }
    this.db.prepare('INSERT INTO subtasks (id, todoId, text, completed, completedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(
      subtask.id, subtask.todoId, subtask.text, 0, null, subtask.createdAt
    )
    return subtask
  }

  getSubtasksForTodo(todoId: string): Subtask[] {
    const rows = this.db.prepare('SELECT * FROM subtasks WHERE todoId = ? ORDER BY createdAt ASC').all(todoId) as Array<{
      id: string; todoId: string; text: string; completed: number; completedAt: string | null; createdAt: string
    }>
    return rows.map(r => ({ ...r, completed: Boolean(r.completed) }))
  }

  getAllSubtasks(): Subtask[] {
    const rows = this.db.prepare('SELECT * FROM subtasks ORDER BY createdAt ASC').all() as Array<{
      id: string; todoId: string; text: string; completed: number; completedAt: string | null; createdAt: string
    }>
    return rows.map(r => ({ ...r, completed: Boolean(r.completed) }))
  }

  toggleSubtask(id: string, completed: boolean): Subtask {
    const completedAt = completed ? new Date().toISOString() : null
    this.db.prepare('UPDATE subtasks SET completed = ?, completedAt = ? WHERE id = ?').run(completed ? 1 : 0, completedAt, id)
    const row = this.db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as {
      id: string; todoId: string; text: string; completed: number; completedAt: string | null; createdAt: string
    }
    return { ...row, completed: Boolean(row.completed) }
  }

  deleteSubtask(id: string): void {
    this.db.prepare('DELETE FROM subtasks WHERE id = ?').run(id)
  }

  completeAllSubtasks(todoId: string): void {
    const completedAt = new Date().toISOString()
    this.db.prepare('UPDATE subtasks SET completed = 1, completedAt = ? WHERE todoId = ? AND completed = 0').run(completedAt, todoId)
  }

  // Notes
  getNotes(): Note[] {
    const rows = this.db.prepare('SELECT * FROM notes ORDER BY pinned DESC, createdAt DESC').all() as Array<{
      id: string; projectId: string | null; title: string | null; content: string; createdAt: string; pinned: number
    }>
    return rows.map(row => ({ ...row, pinned: Boolean(row.pinned) }))
  }

  addNote(projectId: string | null, content: string, title?: string | null): Note {
    const note: Note = {
      id: uuidv4(),
      projectId: projectId ?? null,
      title: title ?? null,
      content,
      createdAt: new Date().toISOString(),
      pinned: false
    }
    this.db.prepare('INSERT INTO notes (id, projectId, title, content, createdAt, pinned) VALUES (?, ?, ?, ?, ?, ?)').run(
      note.id, note.projectId, note.title, note.content, note.createdAt, 0
    )
    return note
  }

  updateNote(id: string, updates: { content?: string; title?: string | null; pinned?: boolean }): Note {
    const sets: string[] = []
    const params: unknown[] = []
    if (updates.content !== undefined) { sets.push('content = ?'); params.push(updates.content) }
    if ('title' in updates) { sets.push('title = ?'); params.push(updates.title ?? null) }
    if (updates.pinned !== undefined) { sets.push('pinned = ?'); params.push(updates.pinned ? 1 : 0) }
    if (sets.length > 0) {
      this.db.prepare(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`).run(...params, id)
    }
    const row = this.db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as {
      id: string; projectId: string | null; title: string | null; content: string; createdAt: string; pinned: number
    }
    return { ...row, pinned: Boolean(row.pinned) }
  }

  deleteNote(id: string): void {
    this.db.prepare('DELETE FROM notes WHERE id = ?').run(id)
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

  // Granola pending reviews
  getGranolaPendingReviews(): import('../../src/types').GranolaMeetingReview[] {
    const rows = this.db.prepare('SELECT * FROM granola_pending_reviews ORDER BY createdAt ASC').all() as Array<{
      id: string; meetingId: string; meetingTitle: string; meetingSummary: string; todosJson: string; createdAt: string
    }>
    return rows.map(r => ({ ...r, todos: JSON.parse(r.todosJson) }))
  }

  addGranolaPendingReview(review: import('../../src/types').GranolaMeetingReview): void {
    this.db.prepare('INSERT OR IGNORE INTO granola_pending_reviews (id, meetingId, meetingTitle, meetingSummary, todosJson, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(
      review.id, review.meetingId, review.meetingTitle, review.meetingSummary, JSON.stringify(review.todos), review.createdAt
    )
  }

  dismissGranolaPendingReview(id: string): void {
    this.db.prepare('DELETE FROM granola_pending_reviews WHERE id = ?').run(id)
  }

  // Granola tracking
  isGranolaNoteProcessed(noteId: string): boolean {
    const row = this.db.prepare('SELECT noteId FROM granola_processed_notes WHERE noteId = ?').get(noteId)
    return !!row
  }

  markGranolaNoteProcessed(noteId: string): void {
    this.db.prepare('INSERT OR IGNORE INTO granola_processed_notes (noteId, processedAt) VALUES (?, ?)').run(noteId, new Date().toISOString())
  }

  getGranolaLastPolled(): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get('granola_last_polled') as { value: string } | undefined
    return row?.value ?? null
  }

  setGranolaLastPolled(timestamp: string): void {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('granola_last_polled', timestamp)
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
