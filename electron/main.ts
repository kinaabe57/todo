import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { DatabaseService } from './services/database'
import { ClaudeService } from './services/claude'
import { Project, Todo, Note, ChatMessage, AppSettings } from '../src/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
let db: DatabaseService
let claude: ClaudeService

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 }
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  const userDataPath = app.getPath('userData')
  db = new DatabaseService(path.join(userDataPath, 'smart-todo.db'))
  claude = new ClaudeService(db)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers for Projects
ipcMain.handle('get-projects', () => {
  return db.getProjects()
})

ipcMain.handle('add-project', (_event, name: string, description: string) => {
  return db.addProject(name, description)
})

ipcMain.handle('delete-project', (_event, id: string) => {
  return db.deleteProject(id)
})

// IPC Handlers for Todos
ipcMain.handle('get-todos', () => {
  return db.getTodos()
})

ipcMain.handle('add-todo', (_event, projectId: string, text: string, source: 'manual' | 'ai') => {
  return db.addTodo(projectId, text, source)
})

ipcMain.handle('toggle-todo', (_event, id: string, completed: boolean) => {
  return db.toggleTodo(id, completed)
})

ipcMain.handle('delete-todo', (_event, id: string) => {
  return db.deleteTodo(id)
})

// IPC Handlers for Notes
ipcMain.handle('get-notes', () => {
  return db.getNotes()
})

ipcMain.handle('add-note', (_event, projectId: string, content: string) => {
  return db.addNote(projectId, content)
})

// IPC Handlers for Messages
ipcMain.handle('get-messages', () => {
  return db.getMessages()
})

ipcMain.handle('save-message', (_event, message: ChatMessage) => {
  return db.saveMessage(message)
})

// IPC Handler for Claude
ipcMain.handle('send-to-claude', async (_event, message: string, projects: Project[], todos: Todo[], notes: Note[]) => {
  return claude.sendMessage(message, projects, todos, notes)
})

// IPC Handlers for Settings
ipcMain.handle('get-settings', () => {
  return db.getSettings()
})

ipcMain.handle('save-settings', (_event, settings: AppSettings) => {
  return db.saveSettings(settings)
})
