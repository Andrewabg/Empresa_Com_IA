



import { serverDb } from '@/server/supabase'
import type { AgendaSpec } from '@/lib/rotinas/agenda'
import type { Agregado } from '@/lib/fontes/tipos'

export interface FonteRow {
  id: string; nome: string; tipo: 'banco' | 'composio' | 'http' | 'webhook'
  secret_ref: string; ativa: boolean; ultimo_erro: string | null
  
  aviso: string | null
  created_at: string; updated_at: string
}

export interface ConsultaRow {
  id: string; fonte_id: string; rotulo: string; corpo: string
  nota_path: string | null; agenda: AgendaSpec
  proxima_execucao: string; ultima_execucao: string | null
  ultimo_agregado_hash: string | null
  
  ultimo_agregado: Agregado | null
  
  ultimo_erro: string | null
  aprovada_em: string | null; aprovada_por: string | null
  ativa: boolean; created_at: string; updated_at: string
}


export async function listarConsultasVencidas(agoraIso: string, limite = 20): Promise<ConsultaRow[]> {
  const { data, error } = await serverDb().from('fonte_consultas')
    .select('*, fontes!inner(ativa)')
    .eq('ativa', true)
    .eq('fontes.ativa', true)
    .not('aprovada_em', 'is', null)
    .lte('proxima_execucao', agoraIso)
    .order('proxima_execucao', { ascending: true }).limit(limite)
  if (error) throw new Error(`listarConsultasVencidas: ${error.message}`)
  
  return (data ?? []).map(({ fontes: _fonte, ...consulta }) => consulta) as ConsultaRow[]
}


export async function claimConsulta(
  id: string, proximaEsperada: string, novaProxima: string, agoraIso: string,
): Promise<boolean> {
  const { data, error } = await serverDb().from('fonte_consultas')
    .update({ proxima_execucao: novaProxima, ultima_execucao: agoraIso, updated_at: agoraIso })
    .eq('id', id).eq('proxima_execucao', proximaEsperada).eq('ativa', true)
    .select('id')
  if (error) throw new Error(`claimConsulta: ${error.message}`)
  return (data ?? []).length === 1
}

export async function registrarExecucao(input: {
  consultaId: string; registros: number; mudou: boolean; erro?: string | null
}): Promise<void> {
  const { error } = await serverDb().from('fonte_execucoes').insert({
    consulta_id: input.consultaId, registros: input.registros,
    mudou: input.mudou, erro: input.erro ?? null,
  })
  if (error) console.warn('[fontes] registrarExecucao falhou (não-fatal):', error.message)
}


export async function podarExecucoesVelhas(dias = 90): Promise<number> {
  const corte = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await serverDb()
    .from('fonte_execucoes')
    .delete()
    .lt('created_at', corte)
    .select('id')
  if (error) throw new Error(`podarExecucoesVelhas: ${error.message}`)
  return (data ?? []).length
}


export async function salvarHashDoAgregado(
  consultaId: string, hash: string, agregado?: Agregado,
): Promise<void> {
  const patch: { ultimo_agregado_hash: string; ultimo_agregado?: Agregado } = {
    ultimo_agregado_hash: hash,
  }
  if (agregado) patch.ultimo_agregado = agregado
  const { error } = await serverDb().from('fonte_consultas').update(patch).eq('id', consultaId)
  if (error) throw new Error(`salvarHashDoAgregado: ${error.message}`)
}


export async function registrarAvisoDaFonte(fonteId: string, aviso: string | null): Promise<void> {
  const { error } = await serverDb().from('fontes').update({ aviso }).eq('id', fonteId)
  if (error) console.warn('[fontes] registrarAvisoDaFonte falhou (não-fatal):', error.message)
}

export async function registrarErroDaFonte(fonteId: string, erro: string | null): Promise<void> {
  const { error } = await serverDb().from('fontes').update({ ultimo_erro: erro }).eq('id', fonteId)
  if (error) console.warn('[fontes] registrarErroDaFonte falhou (não-fatal):', error.message)
}


export async function registrarErroDaConsulta(consultaId: string, erro: string | null): Promise<void> {
  const { error } = await serverDb().from('fonte_consultas')
    .update({ ultimo_erro: erro }).eq('id', consultaId)
  if (error) console.warn('[fontes] registrarErroDaConsulta falhou (não-fatal):', error.message)
}


export async function sincronizarAlarmeDaFonte(fonteId: string): Promise<void> {
  const { data, error } = await serverDb().from('fonte_consultas')
    .select('ultimo_erro').eq('fonte_id', fonteId)
    .not('ultimo_erro', 'is', null)
    .order('created_at', { ascending: true }).limit(1)
  if (error) {
    console.warn('[fontes] sincronizarAlarmeDaFonte falhou (não-fatal):', error.message)
    return
  }
  const pendente = (data ?? [])[0] as { ultimo_erro: string } | undefined
  await registrarErroDaFonte(fonteId, pendente?.ultimo_erro ?? null)
}


export async function contarFalhasConsecutivas(consultaId: string, janela = 10): Promise<number> {
  const { data, error } = await serverDb().from('fonte_execucoes')
    .select('erro').eq('consulta_id', consultaId)
    .order('created_at', { ascending: false }).limit(janela)
  if (error) throw new Error(`contarFalhasConsecutivas: ${error.message}`)
  let seguidas = 0
  for (const row of (data ?? []) as { erro: string | null }[]) {
    if (row.erro === null) break
    seguidas++
  }
  return seguidas
}


export async function reagendarConsulta(id: string, novaProximaIso: string): Promise<void> {
  const { error } = await serverDb().from('fonte_consultas')
    .update({ proxima_execucao: novaProximaIso }).eq('id', id)
  if (error) throw new Error(`reagendarConsulta: ${error.message}`)
}



export async function criarFonte(input: {
  id: string; nome: string; tipo: 'banco'; secretRef: string; aviso?: string | null
}): Promise<FonteRow> {
  const { data, error } = await serverDb().from('fontes')
    .insert({
      id: input.id, nome: input.nome, tipo: input.tipo, secret_ref: input.secretRef,
      aviso: input.aviso ?? null,
    })
    .select().single()
  if (error) throw new Error(`criarFonte: ${error.message}`)
  return data as FonteRow
}

export async function listarFontes(): Promise<FonteRow[]> {
  const { data, error } = await serverDb().from('fontes').select()
    .order('created_at', { ascending: true })
  if (error) throw new Error(`listarFontes: ${error.message}`)
  return (data ?? []) as FonteRow[]
}

export async function getFonte(id: string): Promise<FonteRow | null> {
  const { data, error } = await serverDb().from('fontes').select().eq('id', id).maybeSingle()
  if (error) throw new Error(`getFonte: ${error.message}`)
  return (data ?? null) as FonteRow | null
}


export async function apagarFonte(id: string): Promise<string | null> {
  const { data, error } = await serverDb().from('fontes').delete().eq('id', id).select('secret_ref')
  if (error) throw new Error(`apagarFonte: ${error.message}`)
  const linhas = (data ?? []) as { secret_ref: string }[]
  return linhas.length ? linhas[0].secret_ref : null
}


export async function alternarFonte(id: string, ativa: boolean): Promise<boolean> {
  const patch: { ativa: boolean; updated_at: string; ultimo_erro?: null } = {
    ativa, updated_at: new Date().toISOString(),
  }
  if (!ativa) patch.ultimo_erro = null
  
  
  
  const { data, error } = await serverDb().from('fontes').update(patch).eq('id', id).select('id')
  if (error) throw new Error(`alternarFonte: ${error.message}`)
  return (data ?? []).length > 0
}


export async function contarFontes(): Promise<number> {
  const { count, error } = await serverDb().from('fontes')
    .select('id', { count: 'exact', head: true })
  if (error) throw new Error(`contarFontes: ${error.message}`)
  return count ?? 0
}


export async function contarConsultasDaFonte(fonteId: string): Promise<number> {
  const { count, error } = await serverDb().from('fonte_consultas')
    .select('id', { count: 'exact', head: true }).eq('fonte_id', fonteId)
  if (error) throw new Error(`contarConsultasDaFonte: ${error.message}`)
  return count ?? 0
}


export async function criarConsulta(input: {
  fonteId: string; rotulo: string; corpo: string; notaPath: string
  agenda: AgendaSpec; proximaExecucao: string
}): Promise<ConsultaRow | null> {
  const { data, error } = await serverDb().from('fonte_consultas').insert({
    fonte_id: input.fonteId, rotulo: input.rotulo, corpo: input.corpo,
    nota_path: input.notaPath, agenda: input.agenda, proxima_execucao: input.proximaExecucao,
  }).select().single()
  if (error) {
    if (error.code === '23505') return null
    throw new Error(`criarConsulta: ${error.message}`)
  }
  return data as ConsultaRow
}

export async function listarConsultasDaFonte(fonteId: string): Promise<ConsultaRow[]> {
  const { data, error } = await serverDb().from('fonte_consultas').select()
    .eq('fonte_id', fonteId).order('created_at', { ascending: true })
  if (error) throw new Error(`listarConsultasDaFonte: ${error.message}`)
  return (data ?? []) as ConsultaRow[]
}


export async function listarConsultasDasFontes(fonteIds: string[]): Promise<ConsultaRow[]> {
  if (!fonteIds.length) return []
  const { data, error } = await serverDb().from('fonte_consultas').select()
    .in('fonte_id', fonteIds).order('created_at', { ascending: true })
  if (error) throw new Error(`listarConsultasDasFontes: ${error.message}`)
  return (data ?? []) as ConsultaRow[]
}

export async function getConsulta(id: string): Promise<ConsultaRow | null> {
  const { data, error } = await serverDb().from('fonte_consultas').select().eq('id', id).maybeSingle()
  if (error) throw new Error(`getConsulta: ${error.message}`)
  return (data ?? null) as ConsultaRow | null
}


export async function aprovarConsulta(id: string, quem: string, quandoIso: string): Promise<void> {
  const { error } = await serverDb().from('fonte_consultas')
    .update({ aprovada_em: quandoIso, aprovada_por: quem, updated_at: quandoIso }).eq('id', id)
  if (error) throw new Error(`aprovarConsulta: ${error.message}`)
}

export async function alternarConsulta(id: string, ativa: boolean): Promise<void> {
  const { error } = await serverDb().from('fonte_consultas')
    .update({ ativa, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(`alternarConsulta: ${error.message}`)
}

export async function apagarConsulta(id: string): Promise<void> {
  const { error } = await serverDb().from('fonte_consultas').delete().eq('id', id)
  if (error) throw new Error(`apagarConsulta: ${error.message}`)
}
