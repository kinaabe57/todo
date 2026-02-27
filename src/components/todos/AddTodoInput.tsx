import { useState, KeyboardEvent } from 'react'
import { Todo } from '../../types'

interface AddTodoInputProps {
  projectId: string
  onAddTodo: (projectId: string, text: string, source?: 'manual' | 'ai') => Promise<Todo>
}

export default function AddTodoInput({ projectId, onAddTodo }: AddTodoInputProps) {
  const [text, setText] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    if (text.trim() && !isAdding) {
      setIsAdding(true)
      try {
        await onAddTodo(projectId, text.trim(), 'manual')
        setText('')
      } finally {
        setIsAdding(false)
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdd()
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="+ Add a new todo..."
        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        disabled={isAdding}
      />
      <button
        onClick={handleAdd}
        disabled={!text.trim() || isAdding}
        className="px-3 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
      >
        Add
      </button>
    </div>
  )
}
