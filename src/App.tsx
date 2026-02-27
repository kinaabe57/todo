import { useState, useEffect } from 'react'
import ChatPanel from './components/chat/ChatPanel'
import TodoPanel from './components/todos/TodoPanel'
import SettingsModal from './components/shared/SettingsModal'
import { Project, Todo, Note, ChatMessage, AppSettings } from './types'

interface UpdateInfo {
  hasUpdate: boolean
  latestVersion?: string
  phase?: 'available' | 'downloading' | 'downloaded' | 'error'
  percent?: number
}

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [settings, setSettings] = useState<AppSettings>({ apiKey: '', celebrationSoundEnabled: true })
  const [showSettings, setShowSettings] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    loadData()
    window.electronAPI.checkForUpdates().catch(console.error)
    window.electronAPI.onUpdateStatus((payload) => {
      const { event, data } = payload
      if (event === 'available') {
        const d = data as { version: string }
        setUpdateInfo({ hasUpdate: true, latestVersion: d.version, phase: 'available' })
      } else if (event === 'not-available') {
        setUpdateInfo({ hasUpdate: false })
      } else if (event === 'progress') {
        const d = data as { percent: number }
        setUpdateInfo(prev => ({ ...prev, hasUpdate: true, phase: 'downloading', percent: d.percent }))
      } else if (event === 'downloaded') {
        setUpdateInfo(prev => ({ ...prev, hasUpdate: true, phase: 'downloaded' }))
      } else if (event === 'error') {
        setUpdateInfo(prev => ({ hasUpdate: false, ...prev, phase: 'error' }))
      }
    })
    return () => {
      window.electronAPI.removeUpdateStatusListener()
    }
  }, [])

  const loadData = async () => {
    try {
      const [projectsData, archivedProjectsData, todosData, notesData, messagesData, settingsData] = await Promise.all([
        window.electronAPI.getProjects(),
        window.electronAPI.getArchivedProjects(),
        window.electronAPI.getTodos(),
        window.electronAPI.getNotes(),
        window.electronAPI.getMessages(),
        window.electronAPI.getSettings()
      ])
      setProjects(projectsData)
      setArchivedProjects(archivedProjectsData)
      setTodos(todosData)
      setNotes(notesData)
      setMessages(messagesData)
      if (settingsData) {
        setSettings(settingsData)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddProject = async (name: string, description: string) => {
    const newProject = await window.electronAPI.addProject(name, description)
    setProjects([...projects, newProject])
    return newProject
  }

  const handleArchiveProject = async (id: string) => {
    const archivedProject = await window.electronAPI.archiveProject(id)
    setProjects(projects.filter(p => p.id !== id))
    setArchivedProjects([archivedProject, ...archivedProjects])
  }

  const handleRestoreProject = async (id: string) => {
    const restoredProject = await window.electronAPI.restoreProject(id)
    setArchivedProjects(archivedProjects.filter(p => p.id !== id))
    setProjects([restoredProject, ...projects])
  }

  const handleAddTodo = async (projectId: string, text: string, source: 'manual' | 'ai' = 'manual') => {
    const newTodo = await window.electronAPI.addTodo(projectId, text, source)
    setTodos([...todos, newTodo])
    return newTodo
  }

  const handleToggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    
    const updatedTodo = await window.electronAPI.toggleTodo(id, !todo.completed)
    setTodos(todos.map(t => t.id === id ? updatedTodo : t))
    return updatedTodo
  }

  const handleDeleteTodo = async (id: string) => {
    await window.electronAPI.deleteTodo(id)
    setTodos(todos.filter(t => t.id !== id))
  }

  const handleUpdateTodoPriority = async (id: string, priority: 'high' | 'medium' | 'low') => {
    const updated = await window.electronAPI.updateTodoPriority(id, priority)
    setTodos(todos.map(t => t.id === id ? updated : t))
  }

  const handleAddNote = async (projectId: string, content: string) => {
    const newNote = await window.electronAPI.addNote(projectId, content)
    setNotes([...notes, newNote])
    return newNote
  }

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])
    await window.electronAPI.saveMessage(userMessage)

    try {
      const response = await window.electronAPI.sendToClaude(content, projects, todos, notes)
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        suggestedTodos: response.suggestedTodos
      }
      
      setMessages(prev => [...prev, assistantMessage])
      await window.electronAPI.saveMessage(assistantMessage)
      return assistantMessage
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response from Claude. Please check your API key in settings.'}`,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
      return errorMessage
    }
  }

  const handleSaveSettings = async (newSettings: AppSettings) => {
    await window.electronAPI.saveSettings(newSettings)
    setSettings(newSettings)
    setShowSettings(false)
  }

  const handleMarkTodoAdded = (messageId: string, todoIndex: number) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.suggestedTodos) {
        const updatedTodos = [...msg.suggestedTodos]
        updatedTodos[todoIndex] = { ...updatedTodos[todoIndex], added: true }
        return { ...msg, suggestedTodos: updatedTodos }
      }
      return msg
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header - draggable title bar */}
      <header className="drag-region flex items-center justify-between pl-20 pr-6 py-5 bg-white border-b border-slate-200 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">Smart Todo</h1>
        <div className="flex items-center gap-2">
          {updateInfo?.hasUpdate && updateInfo.phase === 'available' && (
            <button
              onClick={() => window.electronAPI.downloadUpdate()}
              className="no-drag flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
              title={`Update to ${updateInfo.latestVersion}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Update available
            </button>
          )}
          {updateInfo?.phase === 'downloading' && (
            <span className="no-drag flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Downloading… {updateInfo.percent ?? 0}%
            </span>
          )}
          {updateInfo?.phase === 'downloaded' && (
            <button
              onClick={() => window.electronAPI.installUpdate()}
              className="no-drag flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Restart to update
            </button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="no-drag p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Chat Panel - Left Side */}
        <div className="w-1/2 border-r border-slate-200">
          <ChatPanel
            messages={messages}
            projects={projects}
            onSendMessage={handleSendMessage}
            onAddTodo={handleAddTodo}
            onMarkTodoAdded={handleMarkTodoAdded}
            hasApiKey={!!settings.apiKey}
          />
        </div>

        {/* Todo Panel - Right Side */}
        <div className="w-1/2">
          <TodoPanel
            projects={projects}
            archivedProjects={archivedProjects}
            todos={todos}
            notes={notes}
            onAddProject={handleAddProject}
            onArchiveProject={handleArchiveProject}
            onRestoreProject={handleRestoreProject}
            onAddTodo={handleAddTodo}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
            onUpdateTodoPriority={handleUpdateTodoPriority}
            onAddNote={handleAddNote}
            celebrationEnabled={settings.celebrationSoundEnabled}
          />
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
          updateInfo={updateInfo}
          onDownloadUpdate={() => window.electronAPI.downloadUpdate()}
          onInstallUpdate={() => window.electronAPI.installUpdate()}
        />
      )}
    </div>
  )
}

export default App
