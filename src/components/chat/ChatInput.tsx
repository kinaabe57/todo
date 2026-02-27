import { useState, KeyboardEvent } from 'react'

interface ChatInputProps {
  onSendMessage: (content: string) => void
  isLoading: boolean
  disabled?: boolean
}

export default function ChatInput({ onSendMessage, isLoading, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = () => {
    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="p-4 border-t border-slate-200">
      <div className="flex items-end gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Add API key in Settings to chat..." : "Type a message... (Enter to send, Shift+Enter for new line)"}
          disabled={isLoading || disabled}
          className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
          rows={1}
          style={{ minHeight: '44px', maxHeight: '120px' }}
        />
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || isLoading || disabled}
          className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
