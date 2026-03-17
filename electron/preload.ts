import { contextBridge, ipcRenderer } from 'electron'
import { ChatMessage, AppSettings, Project, Todo, Note } from '../src/types'

contextBridge.exposeInMainWorld('electronAPI', {
  // Projects
  getProjects: () => ipcRenderer.invoke('get-projects'),
  getArchivedProjects: () => ipcRenderer.invoke('get-archived-projects'),
  addProject: (name: string, description: string, color: string) => ipcRenderer.invoke('add-project', name, description, color),
  updateProject: (id: string, name: string, description: string, color: string) => ipcRenderer.invoke('update-project', id, name, description, color),
  archiveProject: (id: string) => ipcRenderer.invoke('archive-project', id),
  restoreProject: (id: string) => ipcRenderer.invoke('restore-project', id),
  deleteProject: (id: string) => ipcRenderer.invoke('delete-project', id),
  reorderProjects: (orderedIds: string[]) => ipcRenderer.invoke('reorder-projects', orderedIds),

  // Todos
  getTodos: () => ipcRenderer.invoke('get-todos'),
  addTodo: (projectId: string, text: string, source: 'manual' | 'ai') => ipcRenderer.invoke('add-todo', projectId, text, source),
  toggleTodo: (id: string, completed: boolean) => ipcRenderer.invoke('toggle-todo', id, completed),
  deleteTodo: (id: string) => ipcRenderer.invoke('delete-todo', id),
  updateTodoPriority: (id: string, priority: string) => ipcRenderer.invoke('update-todo-priority', id, priority),
  moveTodo: (id: string, newProjectId: string) => ipcRenderer.invoke('move-todo', id, newProjectId),

  // Subtasks
  getAllSubtasks: () => ipcRenderer.invoke('get-all-subtasks'),
  addSubtask: (todoId: string, text: string) => ipcRenderer.invoke('add-subtask', todoId, text),
  toggleSubtask: (id: string, completed: boolean) => ipcRenderer.invoke('toggle-subtask', id, completed),
  deleteSubtask: (id: string) => ipcRenderer.invoke('delete-subtask', id),
  completeAllSubtasks: (todoId: string) => ipcRenderer.invoke('complete-all-subtasks', todoId),

  // Notes
  getNotes: () => ipcRenderer.invoke('get-notes'),
  addNote: (projectId: string | null, content: string, title?: string | null) => ipcRenderer.invoke('add-note', projectId, content, title),
  updateNote: (id: string, updates: { content?: string; title?: string | null; pinned?: boolean }) => ipcRenderer.invoke('update-note', id, updates),
  deleteNote: (id: string) => ipcRenderer.invoke('delete-note', id),

  // Messages
  getMessages: () => ipcRenderer.invoke('get-messages'),
  saveMessage: (message: ChatMessage) => ipcRenderer.invoke('save-message', message),

  // Claude
  sendToClaude: (message: string, projects: Project[], todos: Todo[], notes: Note[], history: ChatMessage[]) =>
    ipcRenderer.invoke('send-to-claude', message, projects, todos, notes, history),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke('save-settings', settings),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  openReleasePage: () => ipcRenderer.invoke('open-release-page'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateStatus: (cb: (payload: { event: string; data?: unknown }) => void) =>
    ipcRenderer.on('update-status', (_e, payload) => cb(payload)),
  removeUpdateStatusListener: () => ipcRenderer.removeAllListeners('update-status')
})
