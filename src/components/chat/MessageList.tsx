import { useEffect, useRef } from 'react'
import { ChatMessage, Project } from '../../types'

interface MessageListProps {
  messages: ChatMessage[]
  projects: Project[]
  onAddTodo: (messageId: string, todoIndex: number, text: string, projectId?: string) => void
  isLoading: boolean
}

export default function MessageList({ messages, projects, onAddTodo, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-500">
          <div className="text-4xl mb-4">🤖</div>
          <p className="text-lg font-medium">Start a conversation</p>
          <p className="text-sm mt-2">
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
            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              message.role === 'user'
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 text-slate-800'
            }`}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
            
            {message.suggestedTodos && message.suggestedTodos.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200/50">
                <p className="text-xs font-medium text-slate-600 mb-2">Suggested todos:</p>
                <div className="space-y-2">
                  {message.suggestedTodos.map((todo, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm bg-white/80 rounded-lg px-3 py-2"
                    >
                      <span className="flex-1 text-slate-700">{todo.text}</span>
                      {todo.added ? (
                        <span className="text-xs text-green-600 font-medium">Added ✓</span>
                      ) : (
                        <button
                          onClick={() => onAddTodo(message.id, index, todo.text, todo.projectId)}
                          className="text-xs bg-primary-500 text-white px-2 py-1 rounded hover:bg-primary-600 transition-colors"
                          disabled={projects.length === 0}
                          title={projects.length === 0 ? 'Create a project first' : 'Add to todo list'}
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-slate-100 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-sm text-slate-500">Claude is thinking...</span>
            </div>
          </div>
        </div>
      )}
      
      <div ref={bottomRef} />
    </div>
  )
}
