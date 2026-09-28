import { SupabaseClient } from '@supabase/supabase-js'
import { BrainRepo, Diff } from './repo'
import { Embedder } from './embeddings'
import { Note } from './note'
import { chunkMarkdown } from './chunk'
import { edgesOf } from './edges'


const LOTE_DE_IDS = 200


export const ORCAMENTO_DE_URL = 6000


const custoNaUrl = (id: string) => encodeURIComponent(`"${id}"`).length + 3


export function loteDeIds(ids: string[], orcamento = ORCAMENTO_DE_URL, teto = LOTE_DE_IDS): string[][] {
  const saida: string[][] = []
  let atual: string[] = []
  let bytes = 0
  for (const id of ids) {
    const custo = custoNaUrl(id)
    if (atual.length > 0 && (bytes + custo > orcamento || atual.length >= teto)) {
      saida.push(atual)
      atual = []
      bytes = 0
    }
    atual.push(id)
    bytes += custo
  }
  if (atual.length > 0) saida.push(atual)
  return saida
}



function check(res: { error: { message: string } | null }, ctx: string) {
  if (res.error) throw new Error(`${ctx}: ${res.error.message}`)
}

export class Sync {
  constructor(private db: SupabaseClient, private repo: BrainRepo, private embedder: Embedder) {}

  private async upsertNote(note: Note) {
    check(await this.db.from('notes').upsert({
      id: note.id, path: note.path, title: note.title ?? null, type: note.type,
      tags: note.tags, confidence: note.confidence, updated: new Date().toISOString(),
    }), `upsert note ${note.id}`)
    check(await this.db.from('note_chunks').delete().eq('note_id', note.id), `del chunks ${note.id}`)
    
    const indexed = note.title ? `# ${note.title}\n\n${note.body}` : note.body
    const chunks = chunkMarkdown(indexed)
    const vecs = await this.embedder.embedAll(chunks)
    check(await this.db.from('note_chunks').insert(
      chunks.map((content, i) => ({ note_id: note.id, chunk_index: i, content, embedding: '[' + vecs[i].join(',') + ']' })),
    ), `insert chunks ${note.id}`)
    check(await this.db.from('edges').delete().eq('from_id', note.id), `del edges ${note.id}`)
    const e = edgesOf(note)
    if (e.length) check(await this.db.from('edges').insert(e), `insert edges ${note.id}`)
  }

  private async removeNoteByPath(path: string) {
    const { data, error } = await this.db.from('notes').select('id').eq('path', path).maybeSingle()
    if (error) throw new Error(`find note ${path}: ${error.message}`)
    if (data) {
      check(await this.db.from('edges').delete().eq('from_id', data.id), `del edges ${data.id}`)
      check(await this.db.from('notes').delete().eq('id', data.id), `del note ${data.id}`)
    }
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  private async pruneStale(keepIds: string[]) {
    if (keepIds.length === 0) {
      check(await this.db.from('edges').delete().gte('id', 0), 'prune edges (all)')
      check(await this.db.from('notes').delete().neq('id', ''), 'prune notes (all)')
      return
    }
    const manter = new Set(keepIds)

    
    
    
    
    
    const origens = await this.idsDaTabela('edges', 'from_id')
    const arestasMortas = [...new Set(origens)].filter(id => !manter.has(id))
    for (const lote of loteDeIds(arestasMortas)) {
      check(await this.db.from('edges').delete().in('from_id', lote), 'prune edges')
    }

    const idsDeNotas = await this.idsDaTabela('notes', 'id')
    const notasMortas = idsDeNotas.filter(id => !manter.has(id))
    for (const lote of loteDeIds(notasMortas)) {
      check(await this.db.from('notes').delete().in('id', lote), 'prune notes')
    }
  }

  
  private async idsDaTabela(tabela: 'notes' | 'edges', coluna: 'id' | 'from_id'): Promise<string[]> {
    const PAGINA = 1000
    const saida: string[] = []
    for (let de = 0; ; de += PAGINA) {
      const { data, error } = await this.db.from(tabela).select(coluna).order(coluna).range(de, de + PAGINA - 1)
      if (error) throw new Error(`ler ${coluna} de ${tabela}: ${error.message}`)
      const linhas = (data ?? []) as Record<string, unknown>[]
      for (const l of linhas) {
        const v = l[coluna]
        if (typeof v === 'string') saida.push(v)
      }
      if (linhas.length < PAGINA) return saida
    }
  }

  private async setSha(sha: string) {
    check(await this.db.from('sync_state').update({
      last_synced_sha: sha, embedding_version: this.embedder.version(), updated_at: new Date().toISOString(),
    }).eq('id', 1), 'setSha')
  }

  async syncFull() {
    const notes = await this.repo.listNotes()
    for (const note of notes) await this.upsertNote(note)
    await this.pruneStale(notes.map(n => n.id))
    await this.setSha(await this.repo.headSha())
  }

  
  async syncIncremental(diff: Diff, toSha: string) {
    for (const p of [...diff.added, ...diff.modified]) await this.upsertNote(this.repo.readNote(p))
    for (const p of diff.removed) await this.removeNoteByPath(p)
    await this.setSha(toSha)
  }
}
