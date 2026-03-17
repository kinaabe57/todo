import { useState } from 'react'
import { ChatMessage, Project, Todo } from '../../types'
import MessageList from './MessageList'
import ChatInput from './ChatInput'

interface ChatPanelProps {
  messages: ChatMessage[]
  projects: Project[]
  onSendMessage: (content: string) => Promise<ChatMessage>
  onAddTodo: (projectId: string, text: string, source: 'manual' | 'ai') => Promise<Todo>
  onMarkTodoAdded: (messageId: string, todoIndex: number) => void
  hasApiKey: boolean
  onToggleCollapse: () => void
}

export default function ChatPanel({
  messages,
  projects,
  onSendMessage,
  onAddTodo,
  onMarkTodoAdded,
  hasApiKey,
  onToggleCollapse
}: ChatPanelProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (content: string) => {
    setIsLoading(true)
    try {
      await onSendMessage(content)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSuggestedTodo = async (messageId: string, todoIndex: number, text: string, projectId: string) => {
    if (projectId) {
      await onAddTodo(projectId, text, 'ai')
      onMarkTodoAdded(messageId, todoIndex)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f0f4f8]">
      <div className="px-3 py-2 mac-panel-header flex items-center justify-between">
        <h2 className="text-xs font-bold text-[#1a2a3a] flex items-center gap-2 uppercase tracking-wide">
          <span>💬</span>
          Claude
          {!hasApiKey && (
            <span className="text-xs font-normal text-amber-700 ml-1 normal-case">— add API key in Settings</span>
          )}
        </h2>
        <button
          onClick={onToggleCollapse}
          className="p-1 text-[#4a6080] hover:text-[#1a2a3a] hover:bg-[#b0c4d8] transition-colors"
          title="Collapse chat"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <MessageList
        messages={messages}
        projects={projects}
        onAddTodo={handleAddSuggestedTodo}
        isLoading={isLoading}
      />

      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} disabled={!hasApiKey} />
    </div>
  )
}
