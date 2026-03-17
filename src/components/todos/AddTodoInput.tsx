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
    if (e.key === 'Enter') {
      handleAdd()
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="+ Add a new todo..."
      className="w-full px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 mac-inset"
      disabled={isAdding}
    />
  )
}
