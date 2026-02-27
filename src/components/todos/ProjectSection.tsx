import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Project, Todo, Note } from '../../types'
import TodoItem from './TodoItem'
import AddTodoInput from './AddTodoInput'
import AddNoteModal from './AddNoteModal'

interface SortableTodoItemProps {
  todo: Todo
  onToggle: (id: string) => Promise<Todo | undefined>
  onDelete: (id: string) => Promise<void>
  celebrationEnabled: boolean
}

function SortableTodoItem({ todo, onToggle, onDelete, celebrationEnabled }: SortableTodoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: todo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto'
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TodoItem
        todo={todo}
        onToggle={onToggle}
        onDelete={onDelete}
        celebrationEnabled={celebrationEnabled}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

interface ProjectSectionProps {
  project: Project
  todos: Todo[]
  notes: Note[]
  onAddTodo: (projectId: string, text: string, source?: 'manual' | 'ai') => Promise<Todo>
  onToggleTodo: (id: string) => Promise<Todo | undefined>
  onDeleteTodo: (id: string) => Promise<void>
  onAddNote: (projectId: string, content: string) => Promise<Note>
  onArchiveProject: (id: string) => Promise<void>
  onReorderTodos?: (projectId: string, todoIds: string[]) => Promise<void>
  celebrationEnabled: boolean
}

export default function ProjectSection({
  project,
  todos,
  notes,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onAddNote,
  onArchiveProject,
  onReorderTodos,
  celebrationEnabled
}: ProjectSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [localTodos, setLocalTodos] = useState<Todo[]>(todos)

  // Update local todos when props change (new todos added or completed status changes)
  useEffect(() => {
    const todoIds = new Set(todos.map(t => t.id))
    const localIds = new Set(localTodos.map(t => t.id))
    
    // Check if todos were added or removed
    const hasNewTodos = todos.some(t => !localIds.has(t.id))
    const hasRemovedTodos = localTodos.some(t => !todoIds.has(t.id))
    
    // Check if completion status changed
    const hasStatusChange = todos.some(t => {
      const local = localTodos.find(lt => lt.id === t.id)
      return local && local.completed !== t.completed
    })
    
    if (hasNewTodos || hasRemovedTodos || hasStatusChange) {
      // Preserve local order for existing todos, add new ones at appropriate positions
      const orderedTodos = localTodos
        .filter(lt => todoIds.has(lt.id))
        .map(lt => todos.find(t => t.id === lt.id)!)
      
      // Add any new todos
      const newTodos = todos.filter(t => !localIds.has(t.id))
      setLocalTodos([...newTodos, ...orderedTodos])
    }
  }, [todos])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const pendingTodos = localTodos.filter(t => !t.completed)
  const completedTodos = localTodos.filter(t => t.completed)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const oldIndex = pendingTodos.findIndex(t => t.id === active.id)
      const newIndex = pendingTodos.findIndex(t => t.id === over.id)
      
      const newPendingOrder = arrayMove(pendingTodos, oldIndex, newIndex)
      const newTodos = [...newPendingOrder, ...completedTodos]
      setLocalTodos(newTodos)
      
      if (onReorderTodos) {
        await onReorderTodos(project.id, newTodos.map(t => t.id))
      }
    }
  }

  const handleAddNote = async (content: string) => {
    await onAddNote(project.id, content)
    setShowNoteModal(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Project Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
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
            <span className="text-lg">📁</span>
            <span className="font-medium text-slate-800">{project.name}</span>
            <span className="text-sm text-slate-500">
              ({pendingTodos.length} pending)
            </span>
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                  <button
                    onClick={() => {
                      setShowNoteModal(true)
                      setShowMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Add Note
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Archive project "${project.name}"? You can restore it later from the archived projects section.`)) {
                        onArchiveProject(project.id)
                      }
                      setShowMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-amber-50 text-amber-600 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Archive Project
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        
        {project.description && (
          <p className="text-sm text-slate-500 mt-1 ml-8">{project.description}</p>
        )}
        
        {notes.length > 0 && (
          <div className="mt-2 ml-8">
            <p className="text-xs text-slate-400 mb-1">{notes.length} note(s)</p>
          </div>
        )}
      </div>

      {/* Todo List */}
      {isExpanded && (
        <div className="p-3">
          {/* Add Todo Input */}
          <AddTodoInput projectId={project.id} onAddTodo={onAddTodo} />

          {/* Pending Todos */}
          <div className="mt-3 space-y-1">
            {pendingTodos.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                No pending todos. Add one above!
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={pendingTodos.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {pendingTodos.map(todo => (
                    <SortableTodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={onToggleTodo}
                      onDelete={onDeleteTodo}
                      celebrationEnabled={celebrationEnabled}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Completed Todos Toggle */}
          {completedTodos.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showCompleted ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {showCompleted ? 'Hide' : 'Show'} {completedTodos.length} completed
              </button>

              {showCompleted && (
                <div className="mt-2 space-y-1">
                  {completedTodos.map(todo => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={onToggleTodo}
                      onDelete={onDeleteTodo}
                      celebrationEnabled={celebrationEnabled}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <AddNoteModal
          projectName={project.name}
          onAdd={handleAddNote}
          onClose={() => setShowNoteModal(false)}
        />
      )}
    </div>
  )
}
