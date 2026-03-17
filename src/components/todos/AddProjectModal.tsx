import { useState } from 'react'
import { Project } from '../../types'

export const PROJECT_COLORS = [
  { id: 'bondi',      hex: '#0095b6', label: 'Bondi Blue'  },
  { id: 'blueberry',  hex: '#2244cc', label: 'Blueberry'   },
  { id: 'grape',      hex: '#8833cc', label: 'Grape'       },
  { id: 'strawberry', hex: '#cc2255', label: 'Strawberry'  },
  { id: 'tangerine',  hex: '#dd6600', label: 'Tangerine'   },
  { id: 'lime',       hex: '#448800', label: 'Lime'        },
  { id: 'sage',       hex: '#558877', label: 'Sage'        },
  { id: 'slate',      hex: '#556688', label: 'Slate'       },
  { id: 'graphite',   hex: '#555566', label: 'Graphite'    },
  { id: 'flower',     hex: '#bb4488', label: 'Flower'      },
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
        <div className="px-4 py-2 mac-panel-header flex items-center gap-2 border-b border-[#8090b0]">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: '1px 1px 0 rgba(0,0,0,0.3)' }} />
          <h3 className="text-xs font-bold text-[#1a2a3a] uppercase tracking-wide">
            {isEdit ? 'Edit Project' : 'New Project'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 bg-[#c8d4e0]">
          {error && (
            <div className="p-2 bg-[#f8d0d0] border border-[#c04040] text-xs text-[#802020]">
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
              className="px-4 py-1.5 text-xs text-[#1a2a3a] mac-raised hover:bg-[#b0c4d8] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="px-4 py-1.5 text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{
                backgroundColor: color,
                boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.25), inset -1px -1px 0 rgba(0,0,0,0.2), 1px 1px 0 rgba(0,0,0,0.35)'
              }}
            >
              {isSaving ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
