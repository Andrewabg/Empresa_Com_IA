
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve, sep } from 'node:path'
import { serializeNote, type Note } from '@/brain/note'
import type { BrainRepo } from '@/brain/repo'
import { mergeFrontmatter, deriveId, type MergeMode, type WriteIntent } from '@/lib/brain-frontmatter'
import { isSafeNotePath } from '@/lib/brain/safePath'

export interface PersistInput {
  
  
  mode: MergeMode
  body: string
  intent: WriteIntent
}


export class NoteWriter {
  constructor(private repo: BrainRepo) {}

  persist(input: PersistInput): Note {
    const { intent, body, mode } = input
    
    
    
    if (!isSafeNotePath(intent.path)) {
      throw new Error(`[NoteWriter] path de nota inseguro rejeitado: ${JSON.stringify(intent.path)}`)
    }
    
    
    
    
    
    
    if (!intent.path.endsWith('.md')) {
      throw new Error(`[NoteWriter] path de nota sem extensão .md (a nota ficaria invisível): ${JSON.stringify(intent.path)}`)
    }
    const abs = join(this.repo.dir, intent.path)
    const rootResolved = resolve(this.repo.dir)
    const absResolved = resolve(abs)
    if (absResolved !== rootResolved && !absResolved.startsWith(rootResolved + sep)) {
      throw new Error(`[NoteWriter] path de nota fora da raiz do Cérebro: ${JSON.stringify(intent.path)}`)
    }
    const existing = existsSync(abs) ? this.repo.readNote(intent.path) : null
    const fm = mergeFrontmatter(existing, intent, mode)
    const note: Note = { ...fm, path: intent.path, body }
    
    
    
    
    
    
    
    
    
    const idEsperado = deriveId(intent.path)
    if (note.id !== idEsperado) {
      throw new Error(
        `[NoteWriter] id da nota diverge do path: id=${JSON.stringify(note.id)} ` +
        `esperado=${JSON.stringify(idEsperado)} path=${JSON.stringify(intent.path)}`,
      )
    }
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, serializeNote(note))
    return note
  }
}
