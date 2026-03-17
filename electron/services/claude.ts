import Anthropic from '@anthropic-ai/sdk'
import { DatabaseService } from './database'
import { Project, Todo, Note, ChatMessage } from '../../src/types'

interface ClaudeResponse {
  content: string
  suggestedTodos?: { text: string; projectId?: string; added: boolean }[]
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<input[^>]*checked[^>]*>/gi, '[x]')
    .replace(/<input[^>]*>/gi, '[ ]')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export class ClaudeService {
  private db: DatabaseService

  constructor(db: DatabaseService) {
    this.db = db
  }

  private getApiKey(): string {
    const settings = this.db.getSettings()
    if (!settings?.apiKey) {
      throw new Error('API key not configured. Please add your Anthropic API key in Settings.')
    }
    return settings.apiKey
  }

  private buildSystemPrompt(projects: Project[], todos: Todo[], notes: Note[]): string {
    // ── Projects & todos ─────────────────────────────────────────────────────
    const projectSummaries = projects.map(project => {
      const projectTodos = todos.filter(t => t.projectId === project.id)
      const pending = projectTodos.filter(t => !t.completed)
      const completed = projectTodos.filter(t => t.completed).length

      let summary = `### Project: ${project.name}`
      if (project.description) summary += `\nDescription: ${project.description}`
      summary += `\nStatus: ${pending.length} pending, ${completed} completed`

      if (pending.length > 0) {
        summary += '\nPending todos:'
        pending.forEach(t => {
          summary += `\n  [${t.priority}] ${t.text}`
        })
      }
      return summary
    }).join('\n\n')

    // ── Notes ────────────────────────────────────────────────────────────────
    const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]))

    const notesSummary = notes.length > 0
      ? notes.map(note => {
          const date = new Date(note.createdAt).toLocaleDateString()
          const project = note.projectId ? ` [Project: ${projectMap[note.projectId] || note.projectId}]` : ''
          const pinned = note.pinned ? ' [pinned]' : ''
          const title = note.title ? `Title: ${note.title}\n` : ''
          const body = stripHtml(note.content)
          return `---\nNote ID: ${note.id}\nDate: ${date}${project}${pinned}\n${title}${body}`
        }).join('\n')
      : 'No notes yet.'

    return `You are a helpful general-purpose assistant with access to the user's personal notes, projects, and todos. You can answer any question — whether it draws on the user's own content or your general knowledge.

## USER'S PROJECTS & TODOS
${projectSummaries || 'No projects yet.'}

## USER'S NOTES
${notesSummary}

## YOUR CAPABILITIES
- Answer any question using general knowledge, external information, or reasoning
- Search through and summarize the user's notes when asked
- Reference specific notes, todos, or project details in your answers
- Help manage tasks: suggest new todos, help prioritize, break down tasks
- Act as a general conversational assistant — not just a productivity tool

## WHEN TO SUGGEST TODOS
Only add a todo list when the user is explicitly asking for task help, action items, or next steps. Do NOT add todos when answering informational questions, summarizing notes, explaining concepts, or having a general conversation.

When todos ARE appropriate, end your response with this exact block (3 by default, more only if the user asks for a detailed breakdown):

SUGGESTED_TODOS:
• [todo text]
• [todo text]
• [todo text]

If for a specific project, prefix the text with **ProjectName**: (e.g. "• **Work**: Write the report").
Do NOT use this block for general answers — only when the user wants actionable tasks.

## TONE
Be concise and direct. Reference the user's actual notes and todos when relevant. Answer general questions directly without forcing them back to task management.`
  }

  async sendMessage(
    message: string,
    projects: Project[],
    todos: Todo[],
    notes: Note[],
    history: ChatMessage[]
  ): Promise<ClaudeResponse> {
    const apiKey = this.getApiKey()
    const client = new Anthropic({ apiKey })

    const systemPrompt = this.buildSystemPrompt(projects, todos, notes)

    // Build conversation history (exclude the current message — it's added separately)
    const conversationMessages: Anthropic.MessageParam[] = history
      .filter(m => m.content && m.content.trim())
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))

    conversationMessages.push({ role: 'user', content: message })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: conversationMessages
    })

    const contentBlock = response.content[0]
    const rawContent = contentBlock.type === 'text' ? contentBlock.text : ''

    const suggestedTodos = this.extractSuggestedTodos(rawContent, projects)

    // Strip the SUGGESTED_TODOS block from the displayed message
    const content = rawContent.replace(/\n*SUGGESTED_TODOS:\s*\n[\s\S]*$/, '').trim()

    return {
      content,
      suggestedTodos: suggestedTodos.length > 0 ? suggestedTodos : undefined
    }
  }

  private extractSuggestedTodos(
    content: string,
    projects: Project[]
  ): { text: string; projectId?: string; added: boolean }[] {
    // Only parse the explicit SUGGESTED_TODOS: section — ignore all other bullets
    const sectionMatch = content.match(/SUGGESTED_TODOS:\s*\n([\s\S]+?)(?:\n\n|$)/)
    if (!sectionMatch) return []

    const todos: { text: string; projectId?: string; added: boolean }[] = []
    const bulletPoints = sectionMatch[1].match(/[•\-\*]\s+(.+)/g)
    if (!bulletPoints) return []

    for (const point of bulletPoints) {
      let text = point.replace(/^[•\-\*]\s+/, '').trim()
      if (text.length < 3 || text.length > 200) continue

      let projectId: string | undefined
      for (const project of projects) {
        const headerPattern = new RegExp(`^\\*\\*${project.name}\\*\\*:?\\s*`, 'i')
        if (headerPattern.test(text)) {
          projectId = project.id
          text = text.replace(headerPattern, '').trim()
          break
        }
      }

      if (!projectId && projects.length === 1) {
        projectId = projects[0].id
      }

      todos.push({ text, projectId, added: false })
    }

    return todos
  }
}
