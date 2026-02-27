import { useState, useEffect } from 'react'
import ChatPanel from './components/chat/ChatPanel'
import TodoPanel from './components/todos/TodoPanel'
import SettingsModal from './components/shared/SettingsModal'
import { Project, Todo, Note, ChatMessage, AppSettings } from './types'

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [settings, setSettings] = useState<AppSettings>({ apiKey: '', celebrationSoundEnabled: true })
  const [showSettings, setShowSettings] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [projectsData, todosData, notesData, messagesData, settingsData] = await Promise.all([
        window.electronAPI.getProjects(),
        window.electronAPI.getTodos(),
        window.electronAPI.getNotes(),
        window.electronAPI.getMessages(),
        window.electronAPI.getSettings()
      ])
      setProjects(projectsData)
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

  const handleDeleteProject = async (id: string) => {
    await window.electronAPI.deleteProject(id)
    setProjects(projects.filter(p => p.id !== id))
    setTodos(todos.filter(t => t.projectId !== id))
    setNotes(notes.filter(n => n.projectId !== id))
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
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">Smart Todo</h1>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
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
            todos={todos}
            notes={notes}
            onAddProject={handleAddProject}
            onDeleteProject={handleDeleteProject}
            onAddTodo={handleAddTodo}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
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
        />
      )}
    </div>
  )
}

export default App
