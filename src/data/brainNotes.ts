
import { serverDb } from '../server/supabase'
import type { MockNote } from '../mock/types'
import type { BrainRepo } from '../brain/repo'
import { trechoDaNota } from '../lib/brain/trechoDaNota'


type NotesBrain = { repo: BrainRepo } | null


export async function listNotes(brain?: NotesBrain, limit = 200): Promise<MockNote[]> {
  
  
  let resolvedBrain: NotesBrain

  if (brain !== undefined) {
    resolvedBrain = brain
  } else {
    try {
      const { getBrain } = await import('../server/brain/runtime')
      resolvedBrain = await getBrain()
    } catch (err: unknown) {
      
      
      
      
      
      const name = err instanceof Error ? err.name : ''
      if (name !== 'NotConfiguredError') {
        console.warn('[listNotes] getBrain fail-open (Cérebro indisponível, usando só o índice do DB):', err)
      }
      resolvedBrain = null
    }
  }

  const db = serverDb()

  
  const { data: notesData, error: notesError } = await db
    .from('notes')
    .select('id, path, title, updated')
    .order('updated', { ascending: false })
    .limit(limit)

  if (notesError) throw new Error(`listNotes: ${notesError.message}`)
  const notes = notesData ?? []

  if (notes.length === 0) return []

  const noteIds = notes.map((n: { id: string }) => n.id)

  
  
  
  
  const { data: chunksData, error: chunksError } = await db
    .from('note_chunks')
    .select('note_id, chunk_index, content')
    .in('note_id', noteIds)
    .lte('chunk_index', 1)

  if (chunksError) throw new Error(`listNotes chunks: ${chunksError.message}`)

  const snippetByNoteId = new Map<string, string>()
  const temMaisDeUmChunk = new Set<string>()
  for (const chunk of chunksData ?? []) {
    if (chunk.chunk_index === 0) snippetByNoteId.set(chunk.note_id, chunk.content)
    else temMaisDeUmChunk.add(chunk.note_id)
  }

  
  return notes.map((n: { id: string; path: string; title: string | null; updated: string }) => {
    const { texto: snippet, cortado } = trechoDaNota(snippetByNoteId.get(n.id) ?? '')
    
    const snippetParcial = cortado || temMaisDeUmChunk.has(n.id)

    
    
    
    let author_agent: string | null = null
    let source: string | null = null
    if (resolvedBrain !== null) {
      try {
        const fm = resolvedBrain.repo.readNote(n.path)
        author_agent = fm.author_agent ?? null
        source = fm.source ?? null
      } catch {
        author_agent = null
        source = null
      }
    }

    return {
      id: n.id,
      path: n.path,
      title: n.title ?? '',
      snippet,
      snippetParcial,
      author_agent,
      source,
      updatedAt: n.updated,
    } satisfies MockNote
  })
}
