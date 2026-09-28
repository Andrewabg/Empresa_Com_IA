
import type { Note, Frontmatter } from '@/brain/note'


export type MergeMode = 'create' | 'merge' | 'set' | 'edit'

export interface WriteIntent {
  path: string
  title?: string
  type?: Frontmatter['type']
  suggestedTags?: string[]
  authorAgent?: string
  confidence?: number
  
  source?: string
}


export function deriveId(path: string): string {
  return path.replace(/\.md$/, '').replace(/[/\\]/g, '-')
}

const dedupe = (xs: string[]) => [...new Set(xs)]


export function mergeSource(existing: string | undefined, incoming: string | undefined): string | undefined {
  const partes = dedupe(
    [existing, incoming]
      .flatMap((s) => (s ?? '').split(';'))
      .map((s) => s.trim())
      .filter(Boolean),
  )
  return partes.length > 0 ? partes.join('; ') : undefined
}


export function mergeFrontmatter(existing: Note | null, intent: WriteIntent, mode: MergeMode): Frontmatter {
  const id = deriveId(intent.path)
  if (mode === 'create' || existing === null) {
    return {
      id,
      title: intent.title,
      type: intent.type ?? 'semantic',
      tags: dedupe(intent.suggestedTags ?? []),
      source: intent.source,
      author_agent: intent.authorAgent,
      confidence: intent.confidence ?? 0.6,
      links: [],
    }
  }
  
  
  const tituloEditado = mode === 'edit' ? intent.title?.trim() : undefined
  return {
    id,
    title: tituloEditado || (existing.title ?? intent.title),
    type: existing.type,
    tags: dedupe([...existing.tags, ...(intent.suggestedTags ?? [])]),
    source: mergeSource(existing.source, intent.source),
    author_agent: existing.author_agent ?? intent.authorAgent,
    confidence: Math.max(existing.confidence, intent.confidence ?? existing.confidence),
    links: existing.links,
  }
}
