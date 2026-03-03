import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Todo, Subtask } from '../../types'
import CelebrationEffect from '../shared/CelebrationEffect'

const PRIORITY_CYCLE = { high: 'medium', medium: 'low', low: 'high' } as const
const PRIORITY_COLOR = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-slate-300'
}
const PRIORITY_LABEL = {
  high: 'High priority',
  medium: 'Medium priority',
  low: 'Low priority'
}

interface TodoItemProps {
  todo: Todo
  subtasks: Subtask[]
  onToggle: (id: string) => Promise<Todo | undefined>
  onDelete: (id: string) => Promise<void>
  onUpdatePriority: (id: string, priority: 'high' | 'medium' | 'low') => void
  celebrationEnabled: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  onAddSubtask: (todoId: string, text: string) => Promise<Subtask>
  onToggleSubtask: (id: string) => Promise<Subtask | undefined>
  onDeleteSubtask: (id: string) => Promise<void>
}

export default function TodoItem({ todo, subtasks, onToggle, onDelete, onUpdatePriority, celebrationEnabled, dragHandleProps, onAddSubtask, onToggleSubtask, onDeleteSubtask }: TodoItemProps) {
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationPos, setCelebrationPos] = useState({ x: 0, y: 0 })
  const [isAnimating, setIsAnimating] = useState(false)
  const [subtasksExpanded, setSubtasksExpanded] = useState(true)
  const [showCompletedSubtasks, setShowCompletedSubtasks] = useState(false)
  const [showAddSubtask, setShowAddSubtask] = useState(false)
  const [newSubtaskText, setNewSubtaskText] = useState('')
  const subtaskInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showAddSubtask) {
      subtaskInputRef.current?.focus()
    }
  }, [showAddSubtask])

  const handleToggle = async (e: React.MouseEvent) => {
    if (!todo.completed && celebrationEnabled) {
      setCelebrationPos({ x: e.clientX, y: e.clientY })
      setIsAnimating(true)
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 1500)
      setTimeout(() => setIsAnimating(false), 500)
    }
    await onToggle(todo.id)
  }

  const handleAddSubtask = async () => {
    const text = newSubtaskText.trim()
    if (!text) return
    await onAddSubtask(todo.id, text)
    setNewSubtaskText('')
    setSubtasksExpanded(true)
  }

  const handleSubtaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSubtask()
    } else if (e.key === 'Escape') {
      setShowAddSubtask(false)
      setNewSubtaskText('')
    }
  }

  const pendingSubtasks = subtasks.filter(s => !s.completed)
  const completedSubtasks = subtasks.filter(s => s.completed)
  const hasSubtasks = subtasks.length > 0
  const showSubtaskSection = hasSubtasks || showAddSubtask

  return (
    <div className="relative">
      <AnimatePresence>
        {showCelebration && <CelebrationEffect originX={celebrationPos.x} originY={celebrationPos.y} />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        {/* Main todo row */}
        <div className={`group flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors ${
          todo.completed ? 'opacity-60' : ''
        }`}>
          {/* Drag Handle */}
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
              </svg>
            </div>
          )}

          {/* Subtask collapse toggle — only shown when pending subtasks exist */}
          {pendingSubtasks.length > 0 ? (
            <button
              onClick={() => setSubtasksExpanded(!subtasksExpanded)}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
              title={subtasksExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
            >
              <svg
                className={`w-3 h-3 transition-transform ${subtasksExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <span className="flex-shrink-0 w-3" />
          )}

          {/* Priority Dot */}
          {!todo.completed && (
            <button
              onClick={() => onUpdatePriority(todo.id, PRIORITY_CYCLE[todo.priority])}
              className={`flex-shrink-0 w-3 h-3 rounded-full ${PRIORITY_COLOR[todo.priority]} hover:opacity-70 transition-opacity`}
              title={PRIORITY_LABEL[todo.priority]}
            />
          )}

          {/* Checkbox */}
          <button
            onClick={handleToggle}
            className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
              todo.completed
                ? 'bg-green-500 border-green-500'
                : 'border-slate-300 hover:border-primary-500'
            } ${isAnimating ? 'animate-check-bounce' : ''}`}
          >
            {todo.completed && (
              <motion.svg
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </motion.svg>
            )}
          </button>

          {/* Todo Text */}
          <span
            className={`flex-1 text-sm ${
              todo.completed ? 'line-through text-slate-400' : 'text-slate-700'
            }`}
          >
            {todo.text}
          </span>

          {/* Source Badge */}
          {todo.source === 'ai' && (
            <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
              AI
            </span>
          )}

          {/* Completed subtasks count */}
          {completedSubtasks.length > 0 && !todo.completed && (
            <button
              onClick={() => setShowCompletedSubtasks(s => !s)}
              className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-600 transition-all"
              title={showCompletedSubtasks ? 'Hide completed subtasks' : 'Show completed subtasks'}
            >
              <svg className={`w-2.5 h-2.5 transition-transform ${showCompletedSubtasks ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {completedSubtasks.length} done
            </button>
          )}

          {/* Add Subtask Button */}
          {!todo.completed && (
            <button
              onClick={() => { setShowAddSubtask(true); setSubtasksExpanded(true) }}
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-primary-500 transition-all"
              title="Add subtask"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}

          {/* Delete Button */}
          <button
            onClick={() => onDelete(todo.id)}
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
            title="Delete todo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Subtasks */}
        {showSubtaskSection && subtasksExpanded && (
          <div className="ml-24">
            {pendingSubtasks.map(subtask => (
              <div
                key={subtask.id}
                className="group/subtask flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <button
                  onClick={() => onToggleSubtask(subtask.id)}
                  className="flex-shrink-0 w-5 h-5 rounded-md border-2 border-slate-300 hover:border-primary-500 flex items-center justify-center transition-all"
                />
                <span className="flex-1 text-sm text-slate-700">{subtask.text}</span>
                <button
                  onClick={() => onDeleteSubtask(subtask.id)}
                  className="opacity-0 group-hover/subtask:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                  title="Delete subtask"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {completedSubtasks.length > 0 && showCompletedSubtasks && (
              <>
                {completedSubtasks.map(subtask => (
                  <div
                    key={subtask.id}
                    className="group/subtask flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <button
                      onClick={() => onToggleSubtask(subtask.id)}
                      className="flex-shrink-0 w-5 h-5 rounded-md border-2 bg-green-500 border-green-500 flex items-center justify-center transition-all"
                    >
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <span className="flex-1 text-sm line-through text-slate-400">{subtask.text}</span>
                    <button
                      onClick={() => onDeleteSubtask(subtask.id)}
                      className="opacity-0 group-hover/subtask:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                      title="Delete subtask"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </>
            )}

            {showAddSubtask && (
              <div className="flex items-center gap-2 px-2 py-1">
                <span className="flex-shrink-0 w-5 h-5 rounded-md border-2 border-slate-200" />
                <input
                  ref={subtaskInputRef}
                  type="text"
                  value={newSubtaskText}
                  onChange={e => setNewSubtaskText(e.target.value)}
                  onKeyDown={handleSubtaskKeyDown}
                  onBlur={() => {
                    if (!newSubtaskText.trim()) {
                      setShowAddSubtask(false)
                    }
                  }}
                  placeholder="Add subtask…"
                  className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400"
                />
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
