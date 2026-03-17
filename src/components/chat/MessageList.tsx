import { useEffect, useRef, useState } from 'react'
import { ChatMessage, Project } from '../../types'

function ProjectDropdown({ projects, selectedId, onChange }: {
  projects: Project[]
  selectedId: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = projects.find(p => p.id === selectedId)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-[96px] text-xs border border-[#8090b0] px-1.5 py-0.5 text-[#1a2a3a] bg-[#c8d4e0] flex items-center gap-1 hover:bg-[#b0c4d8]"
        style={{ boxShadow: 'inset 1px 1px 0 #ffffff, inset -1px -1px 0 #808080' }}
      >
        <span className="flex-1 truncate">{selected?.name ?? '—'}</span>
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 bg-[#f0f4f8] border border-[#8090b0] z-50 min-w-[7rem]" style={{ boxShadow: '2px 2px 0 rgba(0,0,0,0.3)' }}>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => { onChange(p.id); setOpen(false) }}
              className={`w-full text-left text-xs px-2 py-1 hover:bg-[#dde8f4] ${p.id === selectedId ? 'text-primary-600 font-bold' : 'text-[#1a2a3a]'}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface MessageListProps {
  messages: ChatMessage[]
  projects: Project[]
  onAddTodo: (messageId: string, todoIndex: number, text: string, projectId: string) => void
  isLoading: boolean
}

function SuggestedTodoRow({
  messageId,
  todoIndex,
  text,
  defaultProjectId,
  added,
  projects,
  onAddTodo
}: {
  messageId: string
  todoIndex: number
  text: string
  defaultProjectId?: string
  added: boolean
  projects: Project[]
  onAddTodo: (messageId: string, todoIndex: number, text: string, projectId: string) => void
}) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId && projects.some(p => p.id === defaultProjectId)
      ? defaultProjectId
      : projects[0]?.id ?? ''
  )

  return (
    <div className="flex items-center gap-2 text-xs bg-[#f0f4f8] border border-[#8090b0] px-3 py-2" style={{ boxShadow: 'inset 1px 1px 0 #ffffff, inset -1px -1px 0 #808080' }}>
      <span className="flex-1 text-slate-700">{text}</span>
      {added ? (
        <span className="text-xs text-green-600 font-medium">Added ✓</span>
      ) : (
        <>
          {projects.length > 1 && (
            <ProjectDropdown
              projects={projects}
              selectedId={selectedProjectId}
              onChange={setSelectedProjectId}
            />
          )}
          <button
            onClick={() => onAddTodo(messageId, todoIndex, text, selectedProjectId)}
            className="text-xs bg-primary-500 text-white px-2 py-1 hover:bg-primary-600 transition-colors"
            style={{ boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.25), 1px 1px 0 rgba(0,0,0,0.3)' }}
            disabled={projects.length === 0 || !selectedProjectId}
            title={projects.length === 0 ? 'Create a project first' : 'Add to todo list'}
          >
            + Add
          </button>
        </>
      )}
    </div>
  )
}

export default function MessageList({ messages, projects, onAddTodo, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-[#4a6080]">
          <div className="text-4xl mb-4">🤖</div>
          <p className="text-sm font-bold">Start a conversation</p>
          <p className="text-xs mt-2">
            Ask Claude for todo suggestions, project advice, or help prioritizing your tasks.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] px-3 py-2 text-sm ${
              message.role === 'user'
                ? 'bg-primary-500 text-white'
                : 'bg-[#dde8f4] text-[#1a2a3a] border border-[#8090b0]'
            }`}
          style={message.role === 'assistant' ? { boxShadow: 'inset 1px 1px 0 #ffffff, inset -1px -1px 0 #808080' } : { boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.2), 1px 1px 0 rgba(0,0,0,0.3)' }}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>

            {message.suggestedTodos && message.suggestedTodos.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200/50">
                <p className="text-xs font-medium text-slate-600 mb-2">Suggested todos:</p>
                <div className="space-y-2">
                  {message.suggestedTodos.map((todo, index) => (
                    <SuggestedTodoRow
                      key={index}
                      messageId={message.id}
                      todoIndex={index}
                      text={todo.text}
                      defaultProjectId={todo.projectId}
                      added={todo.added}
                      projects={projects}
                      onAddTodo={onAddTodo}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-[#dde8f4] border border-[#8090b0] px-3 py-2" style={{ boxShadow: 'inset 1px 1px 0 #ffffff, inset -1px -1px 0 #808080' }}>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#6080a0] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-[#6080a0] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-[#6080a0] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-xs text-[#4a6080]">Claude is thinking...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
