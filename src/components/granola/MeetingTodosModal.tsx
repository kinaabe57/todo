import { useState } from 'react'
import { GranolaMeetingReview, Project } from '../../types'

interface Props {
  review: GranolaMeetingReview
  projects: Project[]
  onAddTodo: (projectId: string, text: string, source: 'manual' | 'ai') => Promise<unknown>
  onDismiss: () => void
}

export default function MeetingTodosModal({ review, projects, onAddTodo, onDismiss }: Props) {
  const [selected, setSelected] = useState<boolean[]>(review.todos.map(() => true))
  const [adding, setAdding] = useState(false)

  const toggleAll = (val: boolean) => setSelected(review.todos.map(() => val))

  const handleAdd = async () => {
    setAdding(true)
    const toAdd = review.todos.filter((_, i) => selected[i])
    for (const todo of toAdd) {
      if (!todo.projectId) continue
      await onAddTodo(todo.projectId, todo.text, 'ai')
    }
    setAdding(false)
    onDismiss()
  }

  const selectedCount = selected.filter(Boolean).length
  const addableCount = review.todos.filter((t, i) => selected[i] && t.projectId).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-violet-600 uppercase tracking-wide">From Granola</span>
          </div>
          <h3 className="text-base font-semibold text-slate-800 leading-tight">{review.meetingTitle}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Claude extracted these action items from your meeting</p>
        </div>

        {/* Todo list */}
        <div className="overflow-y-auto flex-1 px-6 py-3 space-y-2">
          {review.todos.map((todo, i) => {
            const project = projects.find(p => p.id === todo.projectId)
            return (
              <label key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selected[i]}
                  onChange={e => setSelected(prev => prev.map((v, j) => j === i ? e.target.checked : v))}
                  className="mt-0.5 w-4 h-4 text-primary-500 border-slate-300 rounded focus:ring-primary-500 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${selected[i] ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                    {todo.text}
                  </p>
                  {project ? (
                    <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-500 mt-0.5">No matching project — will be skipped</span>
                  )}
                </div>
              </label>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={() => selectedCount === review.todos.length ? toggleAll(false) : toggleAll(true)}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            {selectedCount === review.todos.length ? 'Deselect all' : 'Select all'}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || addableCount === 0}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? 'Adding...' : `Add ${addableCount} todo${addableCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
