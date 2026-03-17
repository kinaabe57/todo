import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragCancelEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  CollisionDetection,
  UniqueIdentifier
} from '@dnd-kit/core'
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Project, Todo, Note, Subtask } from '../../types'
import ProjectSection from './ProjectSection'
import AddProjectModal from './AddProjectModal'

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

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
    <div className="mac-raised overflow-hidden">
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

function ProjectDragOverlay({ project }: { project: Project }) {
  return (
    <div className="rounded-xl shadow-lg border border-primary-200 bg-white overflow-hidden rotate-1">
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
          </svg>
          <svg className="w-3 h-3 text-slate-400 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-slate-800">{project.name}</span>
        </div>
      </div>
    </div>
  )
}

interface SortableProjectSectionProps {
  project: Project
  todos: Todo[]
  subtasks: Subtask[]
  notes: Note[]
  onAddTodo: (projectId: string, text: string, source?: 'manual' | 'ai') => Promise<Todo>
  onToggleTodo: (id: string) => Promise<Todo | undefined>
  onDeleteTodo: (id: string) => Promise<void>
  onUpdateTodoPriority: (id: string, priority: 'high' | 'medium' | 'low') => Promise<void>
  onAddNote: (projectId: string | null, content: string) => Promise<Note>
  onArchiveProject: (id: string) => Promise<void>
  onEditProject: (project: Project) => void
  onAddSubtask: (todoId: string, text: string) => Promise<Subtask>
  onToggleSubtask: (id: string) => Promise<Subtask | undefined>
  onDeleteSubtask: (id: string) => Promise<void>
  celebrationEnabled: boolean
  activeId?: UniqueIdentifier | null
  isDraggingProject: boolean
}

function SortableProjectSection({
  project,
  isDraggingProject,
  activeId,
  ...props
}: SortableProjectSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: project.id, data: { type: 'project' } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <ProjectSection
        project={project}
        activeId={activeId}
        isDraggingProject={isDraggingProject}
        dragHandleProps={{ ...attributes, ...listeners }}
        {...props}
      />
    </div>
  )
}

interface TodoPanelProps {
  projects: Project[]
  archivedProjects: Project[]
  todos: Todo[]
  subtasks: Subtask[]
  notes: Note[]
  onAddProject: (name: string, description: string, color: string) => Promise<Project>
  onUpdateProject: (id: string, name: string, description: string, color: string) => Promise<void>
  onArchiveProject: (id: string) => Promise<void>
  onRestoreProject: (id: string) => Promise<void>
  onAddTodo: (projectId: string, text: string, source?: 'manual' | 'ai') => Promise<Todo>
  onToggleTodo: (id: string) => Promise<Todo | undefined>
  onDeleteTodo: (id: string) => Promise<void>
  onUpdateTodoPriority: (id: string, priority: 'high' | 'medium' | 'low') => Promise<void>
  onAddNote: (projectId: string | null, content: string) => Promise<Note>
  onMoveTodo: (todoId: string, newProjectId: string) => Promise<void>
  onAddSubtask: (todoId: string, text: string) => Promise<Subtask>
  onToggleSubtask: (id: string) => Promise<Subtask | undefined>
  onDeleteSubtask: (id: string) => Promise<void>
  onReorderProjects: (orderedIds: string[]) => Promise<void>
  celebrationEnabled: boolean
}

export default function TodoPanel({
  projects,
  archivedProjects,
  todos,
  subtasks,
  notes,
  onAddProject,
  onUpdateProject,
  onArchiveProject,
  onRestoreProject,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onUpdateTodoPriority,
  onAddNote,
  onMoveTodo,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onReorderProjects,
  celebrationEnabled
}: TodoPanelProps) {
  const [showAddProject, setShowAddProject] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [activeDragType, setActiveDragType] = useState<'project' | 'todo' | null>(null)
  const [localTodos, setLocalTodos] = useState<Todo[]>(todos)
  const [localProjects, setLocalProjects] = useState<Project[]>(projects)

  // Sync localTodos with todos prop (new todos, deletions, status/priority/project changes)
  useEffect(() => {
    const todoMap = new Map(todos.map(t => [t.id, t]))
    const localMap = new Map(localTodos.map(t => [t.id, t]))

    const hasNewTodos = todos.some(t => !localMap.has(t.id))
    const hasRemovedTodos = localTodos.some(t => !todoMap.has(t.id))
    const hasChanges = todos.some(t => {
      const local = localMap.get(t.id)
      return local && (
        local.completed !== t.completed ||
        local.priority !== t.priority ||
        local.projectId !== t.projectId
      )
    })

    if (hasNewTodos || hasRemovedTodos || hasChanges) {
      const preserved = localTodos
        .filter(lt => todoMap.has(lt.id))
        .map(lt => todoMap.get(lt.id)!)
      const newTodos = todos.filter(t => !localMap.has(t.id))
      setLocalTodos([...newTodos, ...preserved])
    }
  }, [todos])

  // Sync localProjects with projects prop (additions/removals/data changes — preserve drag order)
  useEffect(() => {
    const projectMap = new Map(projects.map(p => [p.id, p]))
    const localMap = new Map(localProjects.map(p => [p.id, p]))

    const hasNew = projects.some(p => !localMap.has(p.id))
    const hasRemoved = localProjects.some(p => !projectMap.has(p.id))
    const hasChanges = projects.some(p => {
      const local = localMap.get(p.id)
      return local && (local.name !== p.name || local.description !== p.description || local.color !== p.color)
    })

    if (hasNew || hasRemoved || hasChanges) {
      const preserved = localProjects
        .filter(p => projectMap.has(p.id))
        .map(p => projectMap.get(p.id)!)
      const added = projects.filter(p => !localMap.has(p.id))
      setLocalProjects([...preserved, ...added])
    }
  }, [projects])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // When dragging a project, restrict collision detection to project-level sortables only.
  // Without this, closestCenter picks up todo items inside other project cards.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    if (args.active.data.current?.type === 'project') {
      const projectIds = new Set(localProjects.map(p => p.id))
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(c => projectIds.has(String(c.id)))
      })
    }
    return closestCenter(args)
  }, [localProjects])

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id)
    setActiveDragType(active.data.current?.type === 'project' ? 'project' : 'todo')
  }

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    setActiveDragType(null)
    if (!over || active.id === over.id) return

    // Project reorder
    if (active.data.current?.type === 'project') {
      const oldIndex = localProjects.findIndex(p => p.id === active.id)
      const newIndex = localProjects.findIndex(p => p.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(localProjects, oldIndex, newIndex)
        setLocalProjects(reordered)
        await onReorderProjects(reordered.map(p => p.id))
      }
      return
    }

    // Todo reorder / cross-project move
    const activeTodoId = String(active.id)
    const activeTodo = localTodos.find(t => t.id === activeTodoId)
    if (!activeTodo) return

    const overId = String(over.id)

    let targetProjectId: string
    if (overId.startsWith('project-')) {
      targetProjectId = overId.slice('project-'.length)
    } else {
      const overTodo = localTodos.find(t => t.id === overId)
      if (!overTodo) return
      targetProjectId = overTodo.projectId
    }

    if (targetProjectId !== activeTodo.projectId) {
      setLocalTodos(prev =>
        prev.map(t => t.id === activeTodoId ? { ...t, projectId: targetProjectId } : t)
      )
      await onMoveTodo(activeTodoId, targetProjectId)
    } else if (!overId.startsWith('project-')) {
      const projectPendingTodos = localTodos
        .filter(t => t.projectId === targetProjectId && !t.completed)
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

      const oldIndex = projectPendingTodos.findIndex(t => t.id === activeTodoId)
      const newIndex = projectPendingTodos.findIndex(t => t.id === overId)

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(projectPendingTodos, oldIndex, newIndex)
        setLocalTodos(prev => {
          const others = prev.filter(t => t.projectId !== targetProjectId || t.completed)
          return [...others, ...reordered]
        })
      }
    }
  }

  const handleDragCancel = (_e: DragCancelEvent) => {
    setActiveId(null)
    setActiveDragType(null)
  }

  const handleAddProject = async (name: string, description: string, color: string) => {
    await onAddProject(name, description, color)
    setShowAddProject(false)
  }

  const handleUpdateProject = async (id: string, name: string, description: string, color: string) => {
    await onUpdateProject(id, name, description, color)
    setEditingProject(null)
  }

  return (
    <div className="flex flex-col h-full bg-[#b8c8d8]">
      <div className="px-3 py-2 mac-panel-header flex items-center justify-between">
        <h2 className="text-xs font-bold text-[#1a2a3a] flex items-center gap-2 uppercase tracking-wide">
          <span>📋</span>
          My Todos
        </h2>
        <button
          onClick={() => setShowAddProject(true)}
          className="text-xs bg-primary-500 text-white px-3 py-1 mac-raised hover:bg-primary-600 transition-colors flex items-center gap-1"
          style={{ boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.3), inset -1px -1px 0 rgba(0,0,0,0.25), 1px 1px 0 rgba(0,0,0,0.3)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {localProjects.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500">
              <div className="text-4xl mb-4">📁</div>
              <p className="text-lg font-medium">No projects yet</p>
              <p className="text-sm mt-2">Create your first project to start adding todos</p>
              <button
                onClick={() => setShowAddProject(true)}
                className="mt-4 text-xs bg-primary-500 text-white px-4 py-2 hover:bg-primary-600 transition-colors"
          style={{ boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.3), inset -1px -1px 0 rgba(0,0,0,0.25), 1px 1px 0 rgba(0,0,0,0.3)' }}
              >
                Create Project
              </button>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={localProjects.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {localProjects.map(project => (
                <SortableProjectSection
                  key={project.id}
                  project={project}
                  todos={localTodos.filter(t => t.projectId === project.id)}
                  subtasks={subtasks}
                  notes={notes.filter(n => n.projectId === project.id)}
                  onAddTodo={onAddTodo}
                  onToggleTodo={onToggleTodo}
                  onDeleteTodo={onDeleteTodo}
                  onUpdateTodoPriority={onUpdateTodoPriority}
                  onAddNote={onAddNote}
                  onArchiveProject={onArchiveProject}
                  onEditProject={setEditingProject}
                  onAddSubtask={onAddSubtask}
                  onToggleSubtask={onToggleSubtask}
                  onDeleteSubtask={onDeleteSubtask}
                  celebrationEnabled={celebrationEnabled}
                  activeId={activeId}
                  isDraggingProject={activeDragType === 'project'}
                />
              ))}
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeDragType === 'project' && activeId
                ? (() => {
                    const project = localProjects.find(p => p.id === activeId)
                    return project ? <ProjectDragOverlay project={project} /> : null
                  })()
                : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Archived Projects Section */}
        {archivedProjects.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 text-xs text-[#3a5070] hover:text-[#1a2a3a] mb-3"
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
      {editingProject && (
        <AddProjectModal
          project={editingProject}
          onUpdate={handleUpdateProject}
          onClose={() => setEditingProject(null)}
        />
      )}
    </div>
  )
}
