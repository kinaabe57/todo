import { useState, useRef, KeyboardEvent } from 'react'
import { Todo } from '../../types'

interface AddTodoInputProps {
  projectId: string
  onAddTodo: (projectId: string, text: string, source?: 'manual' | 'ai') => Promise<Todo>
}

export default function AddTodoInput({ projectId, onAddTodo }: AddTodoInputProps) {
  const [text, setText] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = async () => {
    if (text.trim() && !isAdding) {
      setIsAdding(true)
      try {
        await onAddTodo(projectId, text.trim(), 'manual')
        setText('')
      } finally {
        setIsAdding(false)
        setTimeout(() => inputRef.current?.focus(), 0)
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className="relative">
      <button
        onClick={handleAdd}
        disabled={!text.trim() || isAdding}
        tabIndex={-1}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 font-semibold text-base leading-none transition-colors text-primary-500 hover:text-primary-400 disabled:text-white/20"
      >
        +
      </button>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a todo…"
        className="w-full pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 mac-inset"
        disabled={isAdding}
      />
    </div>
  )
}
