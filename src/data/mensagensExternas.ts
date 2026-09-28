import { serverDb } from '../server/supabase'
import type { StatusMensagem } from '@/lib/canais/janela'
import { ordenarHistorico } from '@/lib/canais/ordemHistorico'

export interface MensagemExternaRow {
  id: string; conversa_id: string; direcao: 'in' | 'out'
  autor: 'contato' | 'agente' | 'operador'; texto: string; texto_rascunho: string | null
  midia: {
    kind: string; media_id?: string; mime?: string; storage_path?: string; transcricao?: string
    
    dados?: Record<string, unknown>
    texto_estruturado?: string
    
    resposta_a?: string
    
    descricao?: string
    ingestao?: 'pendente' | 'ok' | 'falhou'
    
    slug?: string
    rotulo?: string
    
    como_texto?: boolean
    
    opcoes?: Record<string, unknown>
  } | null
  external_id: string | null; status: StatusMensagem; erro: string | null
  
  origem_em: string | null
  sandbox_ignorada: boolean; created_at: string
}


export async function insertMensagemExterna(input: {
  conversa_id: string; direcao: 'in' | 'out'; autor: MensagemExternaRow['autor']
  texto: string; status: StatusMensagem; external_id?: string | null
  midia?: MensagemExternaRow['midia']; texto_rascunho?: string | null
  
  erro?: string | null
  
  origem_em?: string | null
  
  sandbox_ignorada?: boolean
}): Promise<MensagemExternaRow | null> {
  const { data, error } = await serverDb().from('mensagens_externas').insert(input).select().single()
  if (error) {
    if (error.code === '23505') return null
    throw new Error(`insertMensagemExterna: ${error.message}`)
  }
  return data as MensagemExternaRow
}
export async function getMensagem(id: string): Promise<MensagemExternaRow | null> {
  const { data, error } = await serverDb().from('mensagens_externas').select().eq('id', id).maybeSingle()
  if (error) throw new Error(`getMensagem: ${error.message}`)
  return (data as MensagemExternaRow) ?? null
}
export async function listMensagensConversa(conversaId: string, limit = 30): Promise<MensagemExternaRow[]> {
  
  
  
  
  const { data, error } = await serverDb().from('mensagens_externas').select()
    .eq('conversa_id', conversaId).order('created_at', { ascending: false }).limit(limit)
  if (error) throw new Error(`listMensagensConversa: ${error.message}`)
  
  
  
  
  return ordenarHistorico(((data ?? []) as MensagemExternaRow[]).reverse())
}

export async function listStoragePathsConversa(conversaId: string): Promise<string[]> {
  const { data, error } = await serverDb().from('mensagens_externas')
    .select('midia').eq('conversa_id', conversaId).limit(5000)
  if (error) throw new Error(`listStoragePathsConversa: ${error.message}`)
  return ((data ?? []) as Array<{ midia: MensagemExternaRow['midia'] }>)
    .map((r) => r.midia?.storage_path)
    .filter((p): p is string => typeof p === 'string' && p.length > 0)
}
export async function updateMensagemStatus(id: string, status: StatusMensagem, erro?: string): Promise<void> {
  const { error } = await serverDb().from('mensagens_externas')
    .update({ status, erro: erro ?? null }).eq('id', id)
  if (error) throw new Error(`updateMensagemStatus: ${error.message}`)
}

export async function getMensagemByExternalId(externalId: string): Promise<MensagemExternaRow | null> {
  const { data, error } = await serverDb().from('mensagens_externas').select().eq('external_id', externalId).maybeSingle()
  if (error) throw new Error(`getMensagemByExternalId: ${error.message}`)
  return (data as MensagemExternaRow) ?? null
}

export async function descartarRascunhosPendentes(conversaId: string): Promise<void> {
  const { error } = await serverDb().from('mensagens_externas')
    .update({ status: 'descartada' }).eq('conversa_id', conversaId).eq('status', 'rascunho')
  if (error) throw new Error(`descartarRascunhosPendentes: ${error.message}`)
}

export async function contarSaidasEntregues(conversaId: string): Promise<{ total: number; ultimaEm: string | null }> {
  const { data, count, error } = await serverDb().from('mensagens_externas')
    .select('created_at', { count: 'exact' })
    .eq('conversa_id', conversaId).eq('direcao', 'out').eq('autor', 'agente')
    .in('status', ['enviada', 'entregue', 'lida'])
    .order('created_at', { ascending: false }).limit(1)
  if (error) throw new Error(`contarSaidasEntregues: ${error.message}`)
  return { total: count ?? 0, ultimaEm: (data?.[0]?.created_at as string | undefined) ?? null }
}


export async function listMensagensInboundDesde(desdeIso: string, limite = 500): Promise<MensagemExternaRow[]> {
  const { data, error } = await serverDb().from('mensagens_externas').select()
    .eq('direcao', 'in').eq('autor', 'contato').gt('created_at', desdeIso)
    .order('created_at', { ascending: true }).limit(limite)
  if (error) throw new Error(`listMensagensInboundDesde: ${error.message}`)
  return (data ?? []) as MensagemExternaRow[]
}


export async function countRascunhosPendentes(): Promise<number> {
  const { count, error } = await serverDb().from('mensagens_externas')
    .select('id', { count: 'exact', head: true }).eq('status', 'rascunho')
  if (error) throw new Error(`countRascunhosPendentes: ${error.message}`)
  return count ?? 0
}


export async function aprovarRascunho(
  id: string, textoFinal: string, novoStatus: StatusMensagem, externalId?: string,
  midia?: MensagemExternaRow['midia'],
): Promise<void> {
  const row = await getMensagem(id)
  if (!row) throw new Error('aprovarRascunho: mensagem não existe')
  const { error } = await serverDb().from('mensagens_externas')
    .update({
      texto: textoFinal, texto_rascunho: row.texto_rascunho ?? row.texto,
      status: novoStatus, external_id: externalId ?? row.external_id,
      ...(midia !== undefined ? { midia } : {}),
    })
    .eq('id', id)
  if (error) throw new Error(`aprovarRascunho: ${error.message}`)
}
