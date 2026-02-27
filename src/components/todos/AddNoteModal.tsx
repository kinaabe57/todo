import { useState } from 'react'

interface AddNoteModalProps {
  projectName: string
  onAdd: (content: string) => Promise<void>
  onClose: () => void
}

export default function AddNoteModal({ projectName, onAdd, onClose }: AddNoteModalProps) {
  const [content, setContent] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (content.trim() && !isAdding) {
      setIsAdding(true)
      try {
        await onAdd(content.trim())
      } finally {
        setIsAdding(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">Add Note to {projectName}</h3>
          <p className="text-sm text-slate-500 mt-1">
            Notes help Claude understand your project context for better suggestions.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Note Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="E.g., 'Finished implementing the login page today. Next step is to add password recovery...' or 'The client asked for dark mode support...'"
              rows={5}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              autoFocus
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim() || isAdding}
              className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              {isAdding ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
