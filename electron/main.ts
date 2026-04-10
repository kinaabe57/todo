import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createRequire } from 'module'
import { DatabaseService } from './services/database'
import { ClaudeService } from './services/claude'
import { GranolaService, extractSummary } from './services/granola'
import { Project, Todo, Note, ChatMessage, AppSettings } from '../src/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const _require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronUpdater = _require('electron-updater') as any

const GITHUB_REPO = 'kinaabe57/todo'

let mainWindow: BrowserWindow | null = null
let db: DatabaseService
let claude: ClaudeService
const granola = new GranolaService()
let granolaInterval: ReturnType<typeof setInterval> | null = null

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

function sendUpdateStatus(event: string, data?: unknown) {
  mainWindow?.webContents.send('update-status', { event, data })
}

function setupAutoUpdater() {
  const { autoUpdater } = electronUpdater
  autoUpdater.autoDownload = false
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'kinaabe57',
    repo: 'todo'
  })
  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus('available', { version: info.version })
  })
  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus('not-available')
  })
  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus('progress', { percent: Math.round(progress.percent) })
  })
  autoUpdater.on('update-downloaded', () => {
    sendUpdateStatus('downloaded')
  })
  autoUpdater.on('error', () => {
    sendUpdateStatus('error')
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
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

async function pollGranola() {
  try {
    const settings = db.getSettings()
    if (!settings?.granolaApiKey) return

    // Ensure Uncategorized project exists as fallback
    db.getOrCreateUncategorizedProject()

    const lastPolled = db.getGranolaLastPolled()
    const now = new Date().toISOString()
    const notes = await granola.fetchRecentNotes(settings.granolaApiKey, lastPolled ?? undefined)

    for (const summary of notes.slice(0, 5)) {
      if (db.isGranolaNoteProcessed(summary.id)) continue
      db.markGranolaNoteProcessed(summary.id)

      try {
        const detail = await granola.getNoteDetail(settings.granolaApiKey, summary.id)
        if (!detail.summary_text && !detail.summary_markdown) continue

        const projects = db.getProjects()
        const todos = await claude.extractMeetingTodos(detail, projects, settings.userName)
        if (todos.length === 0) continue

        const review = {
          id: detail.id,
          meetingId: detail.id,
          meetingTitle: detail.title || detail.calendar_event?.title || 'Meeting',
          meetingSummary: extractSummary(detail.summary_text),
          createdAt: new Date().toISOString(),
          todos: todos.map(t => ({ ...t, added: false }))
        }
        db.addGranolaPendingReview(review)
        mainWindow?.webContents.send('granola-reviews-updated')
      } catch (err) {
        console.error('Failed to process Granola note:', summary.id, err)
      }
    }

    db.setGranolaLastPolled(now)
  } catch (err) {
    console.error('Granola poll failed:', err)
  }
}

function startGranolaPoll() {
  if (granolaInterval) clearInterval(granolaInterval)
  const settings = db.getSettings()
  if (!settings?.granolaApiKey) return
  pollGranola()
  granolaInterval = setInterval(pollGranola, 5 * 60 * 1000)
}

app.whenReady().then(() => {
  const userDataPath = app.getPath('userData')
  db = new DatabaseService(path.join(userDataPath, 'smart-todo.db'))
  claude = new ClaudeService(db)

  setupAutoUpdater()
  createWindow()
  startGranolaPoll()

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

ipcMain.handle('get-archived-projects', () => {
  return db.getArchivedProjects()
})

ipcMain.handle('add-project', (_event, name: string, description: string, color: string) => {
  return db.addProject(name, description, color)
})

ipcMain.handle('update-project', (_event, id: string, name: string, description: string, color: string) => {
  return db.updateProject(id, name, description, color)
})

ipcMain.handle('archive-project', (_event, id: string) => {
  return db.archiveProject(id)
})

ipcMain.handle('restore-project', (_event, id: string) => {
  return db.restoreProject(id)
})

ipcMain.handle('delete-project', (_event, id: string) => {
  return db.deleteProject(id)
})

ipcMain.handle('reorder-projects', (_event, orderedIds: string[]) => {
  return db.reorderProjects(orderedIds)
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

ipcMain.handle('update-todo', (_event, id: string, text: string) => {
  return db.updateTodo(id, text)
})

ipcMain.handle('move-todo', (_event, id: string, newProjectId: string) => {
  return db.moveTodo(id, newProjectId)
})

// IPC Handlers for Subtasks
ipcMain.handle('get-all-subtasks', () => {
  return db.getAllSubtasks()
})

ipcMain.handle('add-subtask', (_event, todoId: string, text: string) => {
  return db.addSubtask(todoId, text)
})

ipcMain.handle('toggle-subtask', (_event, id: string, completed: boolean) => {
  return db.toggleSubtask(id, completed)
})

ipcMain.handle('delete-subtask', (_event, id: string) => {
  return db.deleteSubtask(id)
})

ipcMain.handle('complete-all-subtasks', (_event, todoId: string) => {
  return db.completeAllSubtasks(todoId)
})

// IPC Handlers for Notes
ipcMain.handle('get-notes', () => {
  return db.getNotes()
})

ipcMain.handle('add-note', (_event, projectId: string | null, content: string, title?: string | null) => {
  return db.addNote(projectId, content, title)
})

ipcMain.handle('update-note', (_event, id: string, updates: { content?: string; title?: string | null; pinned?: boolean }) => {
  return db.updateNote(id, updates)
})

ipcMain.handle('delete-note', (_event, id: string) => {
  return db.deleteNote(id)
})

// IPC Handlers for Messages
ipcMain.handle('get-messages', () => {
  return db.getMessages()
})

ipcMain.handle('save-message', (_event, message: ChatMessage) => {
  return db.saveMessage(message)
})

// IPC Handler for Claude
ipcMain.handle('send-to-claude', async (_event, message: string, projects: Project[], todos: Todo[], notes: Note[], history: ChatMessage[]) => {
  return claude.sendMessage(message, projects, todos, notes, history)
})

// IPC Handlers for Settings
ipcMain.handle('get-settings', () => {
  return db.getSettings()
})

ipcMain.handle('save-settings', (_event, settings: AppSettings) => {
  db.saveSettings(settings)
  startGranolaPoll()
})

// IPC Handlers for Updates
ipcMain.handle('check-for-updates', async () => {
  if (app.isPackaged) {
    await electronUpdater.autoUpdater.checkForUpdates()
  } else {
    return { currentVersion: app.getVersion() }
  }
})

ipcMain.handle('download-update', () => {
  if (app.isPackaged) {
    electronUpdater.autoUpdater.downloadUpdate()
  }
})

ipcMain.handle('install-update', () => {
  electronUpdater.autoUpdater.quitAndInstall(false, true)
})

ipcMain.handle('open-release-page', () => {
  shell.openExternal(`https://github.com/${GITHUB_REPO}/releases/latest`)
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

// IPC Handlers for Granola
ipcMain.handle('get-granola-reviews', () => {
  return db.getGranolaPendingReviews()
})

ipcMain.handle('dismiss-granola-review', (_event, id: string) => {
  db.dismissGranolaPendingReview(id)
})

ipcMain.handle('poll-granola-now', async () => {
  await pollGranola()
  mainWindow?.webContents.send('granola-reviews-updated')
})
