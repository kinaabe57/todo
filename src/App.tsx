import { useState, useEffect } from 'react'
import ChatPanel from './components/chat/ChatPanel'
import TodoPanel from './components/todos/TodoPanel'
import NotesPanel from './components/notes/NotesPanel'
import SettingsModal from './components/shared/SettingsModal'
import GranolaInbox from './components/granola/GranolaInbox'
import { Project, Todo, Note, ChatMessage, AppSettings, Subtask, GranolaMeetingReview } from './types'

interface UpdateInfo {
  hasUpdate: boolean
  latestVersion?: string
  phase?: 'available' | 'downloading' | 'downloaded' | 'error'
  percent?: number
}

const NOTE_SORT = (a: Note, b: Note) => {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [settings, setSettings] = useState<AppSettings>({ apiKey: '', celebrationSoundEnabled: true })
  const [showSettings, setShowSettings] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [granolaPendingReviews, setGranolaPendingReviews] = useState<GranolaMeetingReview[]>([])
  const [showGranolaInbox, setShowGranolaInbox] = useState(false)
  const [granolaRefreshing, setGranolaRefreshing] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme ?? 'glass')
  }, [settings.theme])

  // Panel widths (chat and notes); todos takes remaining space
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const [chatWidth, setChatWidth] = useState(340)
  const [notesWidth, setNotesWidth] = useState(300)
  const [triggerNewNote, setTriggerNewNote] = useState(false)

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
    window.electronAPI.onGranolaReviewsUpdated(() => {
      window.electronAPI.getGranolaReviews().then(setGranolaPendingReviews)
    })

    return () => {
      window.electronAPI.removeUpdateStatusListener()
      window.electronAPI.removeGranolaListener()
    }
  }, [])

  const loadData = async () => {
    try {
      const [projectsData, archivedProjectsData, todosData, subtasksData, notesData, messagesData, settingsData, granolaReviews] = await Promise.all([
        window.electronAPI.getProjects(),
        window.electronAPI.getArchivedProjects(),
        window.electronAPI.getTodos(),
        window.electronAPI.getAllSubtasks(),
        window.electronAPI.getNotes(),
        window.electronAPI.getMessages(),
        window.electronAPI.getSettings(),
        window.electronAPI.getGranolaReviews()
      ])
      setProjects(projectsData)
      setArchivedProjects(archivedProjectsData)
      setTodos(todosData)
      setSubtasks(subtasksData)
      setNotes(notesData)
      setMessages(messagesData)
      setGranolaPendingReviews(granolaReviews)
      if (settingsData) {
        setSettings(settingsData)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Panel resize
  const startResize = (panel: 'chat' | 'notes') => (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = panel === 'chat' ? chatWidth : notesWidth

    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startX
      const newWidth = Math.max(180, Math.min(560,
        panel === 'chat' ? startWidth + delta : startWidth - delta
      ))
      panel === 'chat' ? setChatWidth(newWidth) : setNotesWidth(newWidth)
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleAddProject = async (name: string, description: string, color: string) => {
    const newProject = await window.electronAPI.addProject(name, description, color)
    setProjects([...projects, newProject])
    return newProject
  }

  const handleUpdateProject = async (id: string, name: string, description: string, color: string) => {
    const updated = await window.electronAPI.updateProject(id, name, description, color)
    setProjects(prev => prev.map(p => p.id === id ? updated : p))
  }

  const handleReorderProjects = async (orderedIds: string[]) => {
    await window.electronAPI.reorderProjects(orderedIds)
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

    const completing = !todo.completed
    const updatedTodo = await window.electronAPI.toggleTodo(id, completing)
    setTodos(todos.map(t => t.id === id ? updatedTodo : t))

    if (completing) {
      await window.electronAPI.completeAllSubtasks(id)
      const completedAt = new Date().toISOString()
      setSubtasks(prev => prev.map(s =>
        s.todoId === id && !s.completed ? { ...s, completed: true, completedAt } : s
      ))
    }

    return updatedTodo
  }

  const handleAddSubtask = async (todoId: string, text: string) => {
    const newSubtask = await window.electronAPI.addSubtask(todoId, text)
    setSubtasks(prev => [...prev, newSubtask])
    return newSubtask
  }

  const handleToggleSubtask = async (id: string) => {
    const subtask = subtasks.find(s => s.id === id)
    if (!subtask) return
    const updated = await window.electronAPI.toggleSubtask(id, !subtask.completed)
    setSubtasks(prev => prev.map(s => s.id === id ? updated : s))
    return updated
  }

  const handleDeleteSubtask = async (id: string) => {
    await window.electronAPI.deleteSubtask(id)
    setSubtasks(prev => prev.filter(s => s.id !== id))
  }

  const handleDeleteTodo = async (id: string) => {
    await window.electronAPI.deleteTodo(id)
    setTodos(todos.filter(t => t.id !== id))
  }

  const handleUpdateTodo = async (id: string, text: string) => {
    const updated = await window.electronAPI.updateTodo(id, text)
    setTodos(todos.map(t => t.id === id ? updated : t))
  }

  const handleMoveTodo = async (todoId: string, newProjectId: string) => {
    const updated = await window.electronAPI.moveTodo(todoId, newProjectId)
    setTodos(todos.map(t => t.id === todoId ? updated : t))
  }

  const handleAddNote = async (projectId: string | null, content: string, title?: string | null) => {
    const newNote = await window.electronAPI.addNote(projectId, content, title)
    setNotes(prev => [newNote, ...prev].sort(NOTE_SORT))
    return newNote
  }

  const handleUpdateNote = async (id: string, updates: { content?: string; title?: string | null; pinned?: boolean }) => {
    // Optimistic update for pin so the UI responds immediately
    if (updates.pinned !== undefined) {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: updates.pinned! } : n).sort(NOTE_SORT))
    }
    try {
      const updated = await window.electronAPI.updateNote(id, updates)
      setNotes(prev => prev.map(n => n.id === id ? updated : n).sort(NOTE_SORT))
    } catch (err) {
      console.error('Failed to update note:', err)
      // Revert optimistic pin update on failure
      if (updates.pinned !== undefined) {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !updates.pinned } : n).sort(NOTE_SORT))
      }
    }
  }

  const handleDeleteNote = async (id: string) => {
    await window.electronAPI.deleteNote(id)
    setNotes(notes.filter(n => n.id !== id))
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
      const response = await window.electronAPI.sendToClaude(content, projects, todos, notes, messages)
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

  const handleDismissGranolaReview = async (id: string) => {
    await window.electronAPI.dismissGranolaReview(id)
    setGranolaPendingReviews(prev => prev.filter(r => r.id !== id))
  }

  const handleGranolaRefresh = async () => {
    setGranolaRefreshing(true)
    await window.electronAPI.pollGranolaNow()
    const reviews = await window.electronAPI.getGranolaReviews()
    setGranolaPendingReviews(reviews)
    setGranolaRefreshing(false)
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
      <div className="flex items-center justify-center h-screen t-app-bg">
        <div className="text-lg text-white/50">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen t-app-bg">
      {/* Header */}
      <header className="drag-region flex items-center justify-between pl-20 pr-4 py-1 mac-app-bar">
        <h1 className="text-[11px] font-semibold text-white/32 tracking-[0.18em] uppercase select-none">Smart Todo</h1>
        <div className="flex items-center gap-0.5">
          {updateInfo?.hasUpdate && updateInfo.phase === 'available' && (
            <button
              onClick={() => window.electronAPI.downloadUpdate()}
              className="no-drag flex items-center gap-1 px-2.5 py-1 text-xs text-primary-400 hover:bg-white/8 rounded-md transition-colors"
              title={`Update to ${updateInfo.latestVersion}`}
            >
              ↑ Update available
            </button>
          )}
          {updateInfo?.phase === 'downloading' && (
            <span className="no-drag text-xs text-white/45 px-2">
              Downloading… {updateInfo.percent ?? 0}%
            </span>
          )}
          {updateInfo?.phase === 'downloaded' && (
            <button
              onClick={() => window.electronAPI.installUpdate()}
              className="no-drag text-xs text-primary-400 hover:bg-white/8 px-2.5 py-1 rounded-md transition-colors"
            >
              Restart to update
            </button>
          )}
          {updateInfo?.phase === 'error' && (
            <button
              onClick={() => window.electronAPI.openReleasePage()}
              className="no-drag text-xs text-red-400 hover:bg-white/8 px-2.5 py-1 rounded-md transition-colors"
            >
              Download manually
            </button>
          )}
          {settings.granolaApiKey && (
            <button
              onClick={() => setShowGranolaInbox(true)}
              className="no-drag flex items-center gap-1.5 px-2.5 py-1 text-xs text-white/45 hover:text-white/80 hover:bg-white/8 rounded-md transition-colors"
              title="Meeting inbox"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {granolaPendingReviews.length > 0 && (
                <span className="bg-primary-500 text-white rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  {granolaPendingReviews.length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setTriggerNewNote(true)}
            className="no-drag flex items-center gap-1 px-2.5 py-1 text-xs text-white/45 hover:text-white/80 hover:bg-white/8 rounded-md transition-colors"
            title="New note"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Note
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="no-drag p-1.5 text-white/40 hover:text-white/70 hover:bg-white/8 rounded-md transition-colors"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Three-panel main area */}
      <main className="flex flex-1 overflow-hidden">

        {/* Chat panel */}
        {!isChatCollapsed && (
          <div style={{ width: chatWidth }} className="flex-shrink-0 overflow-hidden">
            <ChatPanel
              messages={messages}
              projects={projects}
              onSendMessage={handleSendMessage}
              onAddTodo={handleAddTodo}
              onMarkTodoAdded={handleMarkTodoAdded}
              hasApiKey={!!settings.apiKey}
              onToggleCollapse={() => setIsChatCollapsed(true)}
            />
          </div>
        )}

        {/* Chat resize handle / collapse toggle */}
        {isChatCollapsed ? (
          <button
            onClick={() => setIsChatCollapsed(false)}
            className="flex-shrink-0 w-5 flex items-center justify-center border-r border-white/5 hover:bg-white/5 text-white/25 hover:text-white/55 transition-all duration-200"
            title="Expand chat"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div
            className="flex-shrink-0 w-px cursor-col-resize bg-white/5 hover:bg-primary-500/60 transition-colors duration-200 relative group"
            onMouseDown={startResize('chat')}
          >
            <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
          </div>
        )}

        {/* Todos panel — takes remaining space */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <TodoPanel
            projects={projects}
            archivedProjects={archivedProjects}
            todos={todos}
            subtasks={subtasks}
            notes={notes}
            onAddProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onArchiveProject={handleArchiveProject}
            onRestoreProject={handleRestoreProject}
            onAddTodo={handleAddTodo}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
            onUpdateTodo={handleUpdateTodo}
            onAddNote={handleAddNote}
            onMoveTodo={handleMoveTodo}
            onAddSubtask={handleAddSubtask}
            onToggleSubtask={handleToggleSubtask}
            onDeleteSubtask={handleDeleteSubtask}
            onReorderProjects={handleReorderProjects}
            celebrationEnabled={settings.celebrationSoundEnabled}
          />
        </div>

        {/* Notes resize handle */}
        <div
          className="flex-shrink-0 w-px cursor-col-resize bg-white/5 hover:bg-primary-500/60 transition-colors duration-200 relative"
          onMouseDown={startResize('notes')}
        >
          <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
        </div>

        {/* Notes panel */}
        <div style={{ width: notesWidth }} className="flex-shrink-0 overflow-hidden">
          <NotesPanel
            notes={notes}
            projects={projects}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            triggerNewNote={triggerNewNote}
            onTriggerNewNoteHandled={() => setTriggerNewNote(false)}
          />
        </div>

      </main>

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

      {showGranolaInbox && (
        <GranolaInbox
          reviews={granolaPendingReviews}
          projects={projects}
          onAddTodo={handleAddTodo}
          onDismiss={handleDismissGranolaReview}
          onClose={() => setShowGranolaInbox(false)}
          onRefresh={handleGranolaRefresh}
          refreshing={granolaRefreshing}
        />
      )}
    </div>
  )
}

export default App
