import Anthropic from '@anthropic-ai/sdk'
import { DatabaseService } from './database'
import { Project, Todo, Note } from '../../src/types'

interface ClaudeResponse {
  content: string
  suggestedTodos?: { text: string; projectId?: string; added: boolean }[]
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
    const projectSummaries = projects.map(project => {
      const projectTodos = todos.filter(t => t.projectId === project.id)
      const pending = projectTodos.filter(t => !t.completed).length
      const completed = projectTodos.filter(t => t.completed).length
      const projectNotes = notes.filter(n => n.projectId === project.id)
      
      let summary = `- **${project.name}**: ${project.description || 'No description'}`
      summary += `\n  - Status: ${pending} pending todos, ${completed} completed`
      
      if (projectNotes.length > 0) {
        summary += `\n  - Recent notes:`
        projectNotes.slice(0, 3).forEach(note => {
          const date = new Date(note.createdAt).toLocaleDateString()
          const truncatedContent = note.content.length > 100 
            ? note.content.substring(0, 100) + '...' 
            : note.content
          summary += `\n    - [${date}]: ${truncatedContent}`
        })
      }
      
      const pendingTodos = projectTodos.filter(t => !t.completed)
      if (pendingTodos.length > 0) {
        summary += `\n  - Current todos:`
        pendingTodos.slice(0, 5).forEach(todo => {
          summary += `\n    - ${todo.text}`
        })
      }
      
      return summary
    }).join('\n\n')

    return `You are a helpful productivity assistant that helps manage projects and todos. You have access to the user's current projects and their progress.

CURRENT PROJECTS AND STATUS:
${projectSummaries || 'No projects yet. Help the user get started by suggesting they create their first project.'}

YOUR CAPABILITIES:
1. Suggest actionable todo items based on project context and recent notes
2. Help prioritize tasks and provide productivity advice
3. Answer questions about project status and progress
4. Provide encouragement and support

WHEN SUGGESTING TODOS:
- Make them specific and actionable
- Consider the project context and recent progress
- Format each suggestion on a new line starting with "• "
- If a suggestion is for a specific project, mention the project name

IMPORTANT: When you suggest todos, format them clearly so the user can easily add them to their list. Be concise but helpful.`
  }

  async sendMessage(
    message: string, 
    projects: Project[], 
    todos: Todo[], 
    notes: Note[]
  ): Promise<ClaudeResponse> {
    const apiKey = this.getApiKey()
    const client = new Anthropic({ apiKey })
    
    const systemPrompt = this.buildSystemPrompt(projects, todos, notes)
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: message }
      ]
    })

    const contentBlock = response.content[0]
    const content = contentBlock.type === 'text' ? contentBlock.text : ''
    
    const suggestedTodos = this.extractSuggestedTodos(content, projects)
    
    return {
      content,
      suggestedTodos: suggestedTodos.length > 0 ? suggestedTodos : undefined
    }
  }

  private extractSuggestedTodos(
    content: string, 
    projects: Project[]
  ): { text: string; projectId?: string; added: boolean }[] {
    const todos: { text: string; projectId?: string; added: boolean }[] = []
    
    const bulletPoints = content.match(/[•\-\*]\s+(.+)/g)
    if (!bulletPoints) return todos

    for (const point of bulletPoints) {
      const text = point.replace(/^[•\-\*]\s+/, '').trim()
      
      if (text.length < 5 || text.length > 200) continue
      if (text.toLowerCase().includes('here are') || text.toLowerCase().includes('i suggest')) continue
      
      let projectId: string | undefined
      for (const project of projects) {
        if (text.toLowerCase().includes(project.name.toLowerCase())) {
          projectId = project.id
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
