import { useState } from 'react'
import { Project, Todo, Note } from '../../types'
import ProjectSection from './ProjectSection'
import AddProjectModal from './AddProjectModal'

interface ArchivedProjectCardProps {
  project: Project
  todos: Todo[]
  onRestore: (id: string) => Promise<void>
}

function ArchivedProjectCard({ project, todos, onRestore }: ArchivedProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const pendingTodos = todos.filter(t => !t.completed)
  const completedTodos = todos.filter(t => t.completed)

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left flex-1"
        >
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium text-slate-600">{project.name}</span>
          <span className="text-xs text-slate-400">
            ({todos.length} todo{todos.length !== 1 ? 's' : ''})
          </span>
          {project.archivedAt && (
            <span className="text-xs text-slate-400">
              · archived {new Date(project.archivedAt).toLocaleDateString()}
            </span>
          )}
        </button>
        <button
          onClick={() => onRestore(project.id)}
          className="text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Restore
        </button>
      </div>

      {isExpanded && todos.length > 0 && (
        <div className="px-4 pb-3 border-t border-slate-100">
          {pendingTodos.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-slate-400 mb-1">Pending ({pendingTodos.length})</p>
              <ul className="space-y-1">
                {pendingTodos.map(todo => (
                  <li key={todo.id} className="flex items-center gap-2 text-sm text-slate-600 py-1">
                    <span className="w-4 h-4 rounded border border-slate-300 flex-shrink-0" />
                    <span>{todo.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {completedTodos.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-slate-400 mb-1">Completed ({completedTodos.length})</p>
              <ul className="space-y-1">
                {completedTodos.map(todo => (
                  <li key={todo.id} className="flex items-center gap-2 text-sm text-slate-400 py-1">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="line-through">{todo.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {todos.length === 0 && (
            <p className="text-sm text-slate-400 py-2">No todos in this project</p>
          )}
        </div>
      )}
    </div>
  )
}

interface TodoPanelProps {
  projects: Project[]
  archivedProjects: Project[]
  todos: Todo[]
  notes: Note[]
  onAddProject: (name: string, description: string) => Promise<Project>
  onArchiveProject: (id: string) => Promise<void>
  onRestoreProject: (id: string) => Promise<void>
  onAddTodo: (projectId: string, text: string, source?: 'manual' | 'ai') => Promise<Todo>
  onToggleTodo: (id: string) => Promise<Todo | undefined>
  onDeleteTodo: (id: string) => Promise<void>
  onAddNote: (projectId: string, content: string) => Promise<Note>
  celebrationEnabled: boolean
}

export default function TodoPanel({
  projects,
  archivedProjects,
  todos,
  notes,
  onAddProject,
  onArchiveProject,
  onRestoreProject,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onAddNote,
  celebrationEnabled
}: TodoPanelProps) {
  const [showAddProject, setShowAddProject] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

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
              onArchiveProject={onArchiveProject}
              celebrationEnabled={celebrationEnabled}
            />
          ))
        )}

        {/* Archived Projects Section */}
        {archivedProjects.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-3"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showArchived ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-lg">📦</span>
              Archived Projects ({archivedProjects.length})
            </button>

            {showArchived && (
              <div className="space-y-2">
                {archivedProjects.map(project => (
                  <ArchivedProjectCard
                    key={project.id}
                    project={project}
                    todos={todos.filter(t => t.projectId === project.id)}
                    onRestore={onRestoreProject}
                  />
                ))}
              </div>
            )}
          </div>
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
