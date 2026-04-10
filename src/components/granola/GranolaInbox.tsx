import { useState, useRef, useEffect } from 'react'
import { GranolaMeetingReview, GranolaSuggestedTodo, Project } from '../../types'

interface Props {
  reviews: GranolaMeetingReview[]
  projects: Project[]
  onAddTodo: (projectId: string, text: string, source: 'manual' | 'ai') => Promise<unknown>
  onDismiss: (id: string) => void
  onClose: () => void
  onRefresh: () => void
  refreshing: boolean
}

interface TodoState {
  selected: boolean
  projectId: string | undefined
}

function MeetingCard({
  review,
  projects,
  onAddTodo,
  onDismiss
}: {
  review: GranolaMeetingReview
  projects: Project[]
  onAddTodo: Props['onAddTodo']
  onDismiss: (id: string) => void
}) {
  const [todoStates, setTodoStates] = useState<TodoState[]>(
    review.todos.map((t: GranolaSuggestedTodo) => ({ selected: true, projectId: t.projectId }))
  )
  const [todoTexts, setTodoTexts] = useState<string[]>(review.todos.map(t => t.text))
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (editingIndex !== null) editInputRef.current?.select()
  }, [editingIndex])

  const addableCount = todoStates.filter(s => s.selected && s.projectId).length
  const selectedCount = todoStates.filter(s => s.selected).length
  const allSelected = selectedCount === review.todos.length

  const setProject = (i: number, projectId: string) => {
    setTodoStates(prev => prev.map((s, j) => j === i ? { ...s, projectId } : s))
  }

  const toggleSelected = (i: number, val: boolean) => {
    setTodoStates(prev => prev.map((s, j) => j === i ? { ...s, selected: val } : s))
  }

  const toggleAll = () => {
    setTodoStates(prev => prev.map(s => ({ ...s, selected: !allSelected })))
  }

  const handleAdd = async () => {
    setAdding(true)
    for (let i = 0; i < review.todos.length; i++) {
      const s = todoStates[i]
      if (!s.selected || !s.projectId) continue
      await onAddTodo(s.projectId, todoTexts[i], 'ai')
    }
    setAdding(false)
    onDismiss(review.id)
  }

  const date = new Date(review.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Meeting header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">{review.meetingTitle}</h4>
            <p className="text-xs text-slate-400 mt-0.5">{date}</p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(review.id)}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
          >
            Dismiss
          </button>
        </div>

        {/* Summary */}
        {review.meetingSummary && (
          <div className="mt-2">
            <p className={`text-xs text-slate-500 leading-relaxed ${summaryExpanded ? '' : 'line-clamp-2'}`}>
              {review.meetingSummary}
            </p>
            {review.meetingSummary.length > 120 && (
              <button
                type="button"
                onClick={() => setSummaryExpanded(!summaryExpanded)}
                className="text-xs text-primary-500 hover:text-primary-600 mt-0.5"
              >
                {summaryExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Todo list */}
      <div className="divide-y divide-slate-100">
        {review.todos.map((_todo, i) => {
          const state = todoStates[i]
          const isEditingThis = editingIndex === i
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 group/row">
              <input
                type="checkbox"
                checked={state.selected}
                onChange={e => toggleSelected(i, e.target.checked)}
                className="w-4 h-4 text-primary-500 border-slate-300 rounded focus:ring-primary-500 flex-shrink-0"
              />
              {isEditingThis ? (
                <input
                  ref={editInputRef}
                  value={todoTexts[i]}
                  onChange={e => setTodoTexts(prev => prev.map((t, j) => j === i ? e.target.value : t))}
                  onBlur={() => setEditingIndex(null)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingIndex(null) }}
                  className="flex-1 text-sm text-slate-800 border border-primary-400 rounded px-1.5 py-0.5 outline-none ring-2 ring-primary-200 min-w-0"
                />
              ) : (
                <span
                  className={`flex-1 text-sm min-w-0 ${state.selected ? 'text-slate-800' : 'text-slate-400 line-through'}`}
                  onDoubleClick={() => state.selected && setEditingIndex(i)}
                  title="Double-click to edit"
                >
                  {todoTexts[i]}
                </span>
              )}
              {!isEditingThis && state.selected && (
                <button
                  onClick={() => setEditingIndex(i)}
                  className="opacity-0 group-hover/row:opacity-100 p-1 text-slate-400 hover:text-primary-500 transition-all flex-shrink-0"
                  title="Edit"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              <select
                value={state.projectId ?? ''}
                onChange={e => setProject(i, e.target.value)}
                disabled={!state.selected}
                className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white disabled:opacity-40 disabled:cursor-not-allowed max-w-[140px] flex-shrink-0"
              >
                <option value="">No project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between bg-white/5">
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || addableCount === 0}
          className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {adding ? 'Adding...' : addableCount === 0
            ? 'Select a project to add'
            : `Add ${addableCount} todo${addableCount !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}

export default function GranolaInbox({ reviews, projects, onAddTodo, onDismiss, onClose, onRefresh, refreshing }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="mac-window w-full max-w-xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-white/90">Meeting Inbox</h3>
            <p className="text-xs text-white/50 mt-0.5">
              {reviews.length} unreviewed {reviews.length === 1 ? 'meeting' : 'meetings'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
              title="Check for new meetings"
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Reviews list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-12 text-white/40 text-sm">
              No pending meetings — you're all caught up!
            </div>
          ) : (
            reviews.map(review => (
              <MeetingCard
                key={review.id}
                review={review}
                projects={projects}
                onAddTodo={onAddTodo}
                onDismiss={onDismiss}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
