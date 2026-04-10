import { useState } from 'react'
import { Project } from '../../types'

export const PROJECT_COLORS = [
  { id: 'violet',   hex: '#7c3aed', label: 'Violet'   },
  { id: 'purple',   hex: '#9333ea', label: 'Purple'   },
  { id: 'fuchsia',  hex: '#c026d3', label: 'Fuchsia'  },
  { id: 'rose',     hex: '#e11d48', label: 'Rose'     },
  { id: 'indigo',   hex: '#4338ca', label: 'Indigo'   },
  { id: 'sky',      hex: '#0284c7', label: 'Sky'      },
  { id: 'teal',     hex: '#0d9488', label: 'Teal'     },
  { id: 'emerald',  hex: '#059669', label: 'Emerald'  },
  { id: 'amber',    hex: '#d97706', label: 'Amber'    },
  { id: 'slate',    hex: '#475569', label: 'Slate'    },
]

interface AddProjectModalProps {
  /** Pass an existing project to enter edit mode */
  project?: Project
  onAdd?: (name: string, description: string, color: string) => Promise<void>
  onUpdate?: (id: string, name: string, description: string, color: string) => Promise<void>
  onClose: () => void
}

export default function AddProjectModal({ project, onAdd, onUpdate, onClose }: AddProjectModalProps) {
  const isEdit = !!project
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[6].hex)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim() || isSaving) return
    setIsSaving(true)
    try {
      if (isEdit && project && onUpdate) {
        await onUpdate(project.id, name.trim(), description.trim(), color)
      } else if (onAdd) {
        await onAdd(name.trim(), description.trim(), color)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="mac-window w-full max-w-md mx-4">
        <div className="px-4 py-2 mac-panel-header flex items-center gap-2 border-b border-[#8090b0]/20 rounded-t-2xl">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <h3 className="text-xs font-bold text-[#1a2a3a] uppercase tracking-wide">
            {isEdit ? 'Edit Project' : 'New Project'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#1a2a3a] mb-1 uppercase tracking-wide">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Project"
              className="w-full px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 mac-inset"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1a2a3a] mb-1 uppercase tracking-wide">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this project is about..."
              rows={3}
              className="w-full px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none mac-inset"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1a2a3a] mb-2 uppercase tracking-wide">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(c.hex)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: c.hex, outline: color === c.hex ? `3px solid ${c.hex}` : '3px solid transparent', outlineOffset: '2px' }}
                >
                  {color === c.hex && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-[#1a2a3a] rounded-lg bg-white/50 hover:bg-[#b0c4d8] border border-[#8090b0]/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="px-4 py-1.5 text-xs text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: color }}
            >
              {isSaving ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
