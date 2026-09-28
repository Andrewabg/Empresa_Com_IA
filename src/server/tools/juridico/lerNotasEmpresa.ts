




import { serverDb } from '@/server/supabase'
import { TOPICS, topicTag } from '@/server/interview/topics'

export async function lerNotasEmpresa(_operatorId: string): Promise<string> {
  const tags = TOPICS.map((t) => topicTag(t.id))
  const { data, error } = await serverDb()
    .from('notes')
    .select('title, tags, note_chunks(content, chunk_index)')
    .overlaps('tags', tags)
  if (error) { console.warn('[lerNotasEmpresa] notes:', error.message); return '' }
  type Row = { title?: string; note_chunks?: { content: string; chunk_index: number }[] }
  return (data as Row[] ?? [])
    .map((n) => {
      const corpo = (n.note_chunks ?? []).sort((a, b) => a.chunk_index - b.chunk_index).map((c) => c.content).join('\n')
      return `## ${n.title ?? ''}\n${corpo}`
    })
    .join('\n\n').trim()
}
