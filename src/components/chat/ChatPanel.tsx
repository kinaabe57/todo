import { useState } from 'react'
import { ChatMessage, Project } from '../../types'
import MessageList from './MessageList'
import ChatInput from './ChatInput'

interface ChatPanelProps {
  messages: ChatMessage[]
  projects: Project[]
  onSendMessage: (content: string) => Promise<ChatMessage>
  onAddTodo: (projectId: string, text: string, source: 'manual' | 'ai') => Promise<void>
  onMarkTodoAdded: (messageId: string, todoIndex: number) => void
  hasApiKey: boolean
}

export default function ChatPanel({
  messages,
  projects,
  onSendMessage,
  onAddTodo,
  onMarkTodoAdded,
  hasApiKey
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

  const handleAddSuggestedTodo = async (messageId: string, todoIndex: number, text: string, projectId?: string) => {
    if (!projectId && projects.length > 0) {
      projectId = projects[0].id
    }
    if (projectId) {
      await onAddTodo(projectId, text, 'ai')
      onMarkTodoAdded(messageId, todoIndex)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-lg font-medium text-slate-800 flex items-center gap-2">
          <span className="text-xl">💬</span>
          Chat with Claude
        </h2>
        {!hasApiKey && (
          <p className="text-sm text-amber-600 mt-1">
            Add your Anthropic API key in Settings to start chatting
          </p>
        )}
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
