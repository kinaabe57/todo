import { useState } from 'react'
import { Project, Todo, Note } from '../../types'
import ProjectSection from './ProjectSection'
import AddProjectModal from './AddProjectModal'

interface TodoPanelProps {
  projects: Project[]
  todos: Todo[]
  notes: Note[]
  onAddProject: (name: string, description: string) => Promise<Project>
  onDeleteProject: (id: string) => Promise<void>
  onAddTodo: (projectId: string, text: string, source?: 'manual' | 'ai') => Promise<Todo>
  onToggleTodo: (id: string) => Promise<Todo | undefined>
  onDeleteTodo: (id: string) => Promise<void>
  onAddNote: (projectId: string, content: string) => Promise<Note>
  celebrationEnabled: boolean
}

export default function TodoPanel({
  projects,
  todos,
  notes,
  onAddProject,
  onDeleteProject,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onAddNote,
  celebrationEnabled
}: TodoPanelProps) {
  const [showAddProject, setShowAddProject] = useState(false)

  const handleAddProject = async (name: string, description: string) => {
    await onAddProject(name, description)
    setShowAddProject(false)
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-lg font-medium text-slate-800 flex items-center gap-2">
          <span className="text-xl">📋</span>
          My Todos
        </h2>
        <button
          onClick={() => setShowAddProject(true)}
          className="text-sm bg-primary-500 text-white px-3 py-1.5 rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {projects.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500">
              <div className="text-4xl mb-4">📁</div>
              <p className="text-lg font-medium">No projects yet</p>
              <p className="text-sm mt-2">Create your first project to start adding todos</p>
              <button
                onClick={() => setShowAddProject(true)}
                className="mt-4 text-sm bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
              >
                Create Project
              </button>
            </div>
          </div>
        ) : (
          projects.map(project => (
            <ProjectSection
              key={project.id}
              project={project}
              todos={todos.filter(t => t.projectId === project.id)}
              notes={notes.filter(n => n.projectId === project.id)}
              onAddTodo={onAddTodo}
              onToggleTodo={onToggleTodo}
              onDeleteTodo={onDeleteTodo}
              onAddNote={onAddNote}
              onDeleteProject={onDeleteProject}
              celebrationEnabled={celebrationEnabled}
            />
          ))
        )}
      </div>

      {showAddProject && (
        <AddProjectModal
          onAdd={handleAddProject}
          onClose={() => setShowAddProject(false)}
        />
      )}
    </div>
  )
}
