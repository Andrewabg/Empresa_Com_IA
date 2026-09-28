





import { serverDb } from '../server/supabase'

export interface IgComentarioRow {
  id: string
  canal_id: string
  external_id: string
  midia_id: string
  permalink: string | null
  parent_id: string | null
  autor_external_id: string
  autor_nome: string | null
  texto: string
  comentado_em: string
  
  run_id: string | null
  created_at: string
}

export interface RegistrarComentarioInput {
  canalId: string
  externalId: string
  midiaId: string
  permalink: string | null
  parentId: string | null
  autorExternalId: string
  autorNome: string | null
  texto: string
  comentadoEm: string
}


export async function registrarComentario(input: RegistrarComentarioInput): Promise<IgComentarioRow | null> {
  const { data, error } = await serverDb().from('ig_comentarios').insert({
    canal_id: input.canalId,
    external_id: input.externalId,
    midia_id: input.midiaId,
    permalink: input.permalink,
    parent_id: input.parentId,
    autor_external_id: input.autorExternalId,
    autor_nome: input.autorNome,
    texto: input.texto,
    comentado_em: input.comentadoEm,
  }).select().single()
  if (error) {
    if (error.code === '23505') return getComentarioPorExternalId(input.canalId, input.externalId)
    throw new Error(`registrarComentario: ${error.message}`)
  }
  return data as IgComentarioRow
}


export async function getComentarioPorExternalId(canalId: string, externalId: string): Promise<IgComentarioRow | null> {
  const { data, error } = await serverDb().from('ig_comentarios')
    .select().eq('canal_id', canalId).eq('external_id', externalId).maybeSingle()
  if (error) throw new Error(`getComentarioPorExternalId: ${error.message}`)
  return (data as IgComentarioRow) ?? null
}


export async function ligarComentarioAoRun(comentarioId: string, runId: string): Promise<void> {
  const { error } = await serverDb().from('ig_comentarios')
    .update({ run_id: runId }).eq('id', comentarioId).is('run_id', null)
  if (error) throw new Error(`ligarComentarioAoRun: ${error.message}`)
}
