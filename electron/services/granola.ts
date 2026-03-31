const GRANOLA_API_BASE = 'https://public-api.granola.ai'

export function extractSummary(text: string | null, maxSentences = 6): string {
  if (!text) return ''
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) ?? []
  return sentences.slice(0, maxSentences).join('').trim()
}

export interface GranolaNoteSummary {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface GranolaNote {
  id: string
  title: string | null
  created_at: string
  updated_at: string
  summary_text: string | null
  summary_markdown: string | null
  attendees: Array<{ name: string; email: string }>
  calendar_event: {
    title: string | null
    start_time: string | null
    end_time: string | null
  } | null
}

export class GranolaService {
  async fetchRecentNotes(apiKey: string, updatedAfter?: string): Promise<GranolaNoteSummary[]> {
    const params = new URLSearchParams({ page_size: '10' })
    if (updatedAfter) params.set('updated_after', updatedAfter)

    const response = await fetch(`${GRANOLA_API_BASE}/v1/notes?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    })

    if (!response.ok) throw new Error(`Granola API error: ${response.status}`)
    const data = await response.json() as { notes: GranolaNoteSummary[] }
    return data.notes ?? []
  }

  async getNoteDetail(apiKey: string, noteId: string): Promise<GranolaNote> {
    const response = await fetch(`${GRANOLA_API_BASE}/v1/notes/${noteId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    })
    if (!response.ok) throw new Error(`Granola API error: ${response.status}`)
    return response.json() as Promise<GranolaNote>
  }
}
