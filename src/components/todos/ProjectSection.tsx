import { useState } from 'react'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { useDroppable, UniqueIdentifier } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Project, Todo, Note, Subtask } from '../../types'
import TodoItem from './TodoItem'
import AddTodoInput from './AddTodoInput'
import AddNoteModal from './AddNoteModal'

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

interface SortableTodoItemProps {
  todo: Todo
  subtasks: Subtask[]
  onToggle: (id: string) => Promise<Todo | undefined>
  onDelete: (id: string) => Promise<void>
  onUpdate: (id: string, text: string) => Promise<void>
  celebrationEnabled: boolean
  onAddSubtask: (todoId: string, text: string) => Promise<Subtask>
  onToggleSubtask: (id: string) => Promise<Subtask | undefined>
  onDeleteSubtask: (id: string) => Promise<void>
}

function SortableTodoItem({ todo, subtasks, onToggle, onDelete, onUpdate, celebrationEnabled, onAddSubtask, onToggleSubtask, onDeleteSubtask }: SortableTodoItemProps) {
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
        subtasks={subtasks}
        onToggle={onToggle}
        onDelete={onDelete}
        onUpdate={onUpdate}
        celebrationEnabled={celebrationEnabled}
        dragHandleProps={{ ...attributes, ...listeners }}
        onAddSubtask={onAddSubtask}
        onToggleSubtask={onToggleSubtask}
        onDeleteSubtask={onDeleteSubtask}
      />
    </div>
  )
}

interface ProjectSectionProps {
  project: Project
  todos: Todo[]
  subtasks: Subtask[]
  notes: Note[]
  onAddTodo: (projectId: string, text: string, source?: 'manual' | 'ai') => Promise<Todo>
  onToggleTodo: (id: string) => Promise<Todo | undefined>
  onDeleteTodo: (id: string) => Promise<void>
  onUpdateTodo: (id: string, text: string) => Promise<void>
  onAddNote: (projectId: string | null, content: string) => Promise<Note>
  onArchiveProject: (id: string) => Promise<void>
  onEditProject?: (project: Project) => void
  onAddSubtask: (todoId: string, text: string) => Promise<Subtask>
  onToggleSubtask: (id: string) => Promise<Subtask | undefined>
  onDeleteSubtask: (id: string) => Promise<void>
  celebrationEnabled: boolean
  activeId?: UniqueIdentifier | null
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  isDraggingProject?: boolean
}

export default function ProjectSection({
  project,
  todos,
  subtasks,
  notes,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onUpdateTodo,
  onAddNote,
  onArchiveProject,
  onEditProject,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  celebrationEnabled,
  activeId,
  dragHandleProps,
  isDraggingProject
}: ProjectSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const { setNodeRef, isOver } = useDroppable({
    id: `project-${project.id}`,
    data: { projectId: project.id }
  })

  const pendingTodos = todos.filter(t => !t.completed)
  const completedTodos = todos.filter(t => t.completed)

  // Show drop highlight only when dragging a todo from a different project (not a project card)
  const isDroppingFromOther = isOver && activeId && !todos.some(t => t.id === activeId) && !isDraggingProject

  const handleAddNote = async (content: string) => {
    await onAddNote(project.id, content)
    setShowNoteModal(false)
  }

  const accentColor = project.color || '#64748b'

  return (
    <div
      ref={setNodeRef}
      className={`overflow-hidden transition-colors ${
        isDroppingFromOther
          ? 'border border-primary-400/60 bg-primary-500/8'
          : 'mac-raised'
      }`}
    >
      {/* Project Header */}
      <div
        className="px-3 py-2 group"
        style={isDroppingFromOther ? undefined : {
          borderLeft: `3px solid ${accentColor}`,
          background: `linear-gradient(to right, ${hexToRgba(accentColor, 0.18)} 0%, transparent 75%)`
        }}
      >
        <div className="flex items-center justify-between">
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none mr-1 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
              </svg>
            </div>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-left flex-1"
          >
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              style={{ color: 'rgba(255,255,255,0.8)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-semibold text-white">{project.name}</span>
            {pendingTodos.length > 0 && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
                style={{ background: hexToRgba(accentColor, 0.22), color: accentColor }}
              >
                {pendingTodos.length}
              </span>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-0.5 rounded"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-40 mac-window py-1 z-20">
                  {onEditProject && (
                    <button
                      onClick={() => {
                        onEditProject(project)
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Project
                    </button>
                  )}
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
          <p className="text-xs mt-0.5 ml-5" style={{ color: 'rgba(255,255,255,0.8)' }}>{project.description}</p>
        )}

        {notes.length > 0 && (
          <div className="mt-0.5 ml-5">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{notes.length} note(s)</p>
          </div>
        )}
      </div>

      {/* Todo List */}
      {isExpanded && (
        <div className="p-2">
          {/* Add Todo Input */}
          <AddTodoInput projectId={project.id} onAddTodo={onAddTodo} />

          {/* Pending Todos */}
          <div className="mt-2 space-y-0.5">
            {pendingTodos.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                {isDroppingFromOther ? 'Drop here to move to this project' : 'No pending todos. Add one above!'}
              </p>
            ) : (
              <SortableContext
                items={pendingTodos.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {pendingTodos.map(todo => (
                  <SortableTodoItem
                    key={todo.id}
                    todo={todo}
                    subtasks={subtasks.filter(s => s.todoId === todo.id)}
                    onToggle={onToggleTodo}
                    onDelete={onDeleteTodo}
                    onUpdate={onUpdateTodo}
                    celebrationEnabled={celebrationEnabled}
                    onAddSubtask={onAddSubtask}
                    onToggleSubtask={onToggleSubtask}
                    onDeleteSubtask={onDeleteSubtask}
                  />
                ))}
              </SortableContext>
            )}
          </div>

          {/* Completed Todos Toggle */}
          {completedTodos.length > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-xs text-[#4a6080] hover:text-[#1a2a3a]"
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
                      subtasks={subtasks.filter(s => s.todoId === todo.id)}
                      onToggle={onToggleTodo}
                      onDelete={onDeleteTodo}
                      onUpdate={onUpdateTodo}
                      celebrationEnabled={celebrationEnabled}
                      onAddSubtask={onAddSubtask}
                      onToggleSubtask={onToggleSubtask}
                      onDeleteSubtask={onDeleteSubtask}
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
