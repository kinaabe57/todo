import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Todo } from '../../types'
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
  onToggle: (id: string) => Promise<Todo | undefined>
  onDelete: (id: string) => Promise<void>
  onUpdatePriority: (id: string, priority: 'high' | 'medium' | 'low') => void
  celebrationEnabled: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

export default function TodoItem({ todo, onToggle, onDelete, onUpdatePriority, celebrationEnabled, dragHandleProps }: TodoItemProps) {
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationPos, setCelebrationPos] = useState({ x: 0, y: 0 })
  const [isAnimating, setIsAnimating] = useState(false)

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

  return (
    <div className="relative">
      <AnimatePresence>
        {showCelebration && <CelebrationEffect originX={celebrationPos.x} originY={celebrationPos.y} />}
      </AnimatePresence>
      
      <motion.div
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className={`group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors ${
          todo.completed ? 'opacity-60' : ''
        }`}
      >
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
      </motion.div>
    </div>
  )
}
