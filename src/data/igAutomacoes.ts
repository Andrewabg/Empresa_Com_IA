
import { serverDb } from '../server/supabase'
import type { ModoCasamento } from '@/lib/instagram/palavraChave'
import type { BotaoIg } from '@/lib/instagram/limitesDaMeta'

export type IgGatilho = 'comentario' | 'story' | 'palavra_no_direct'
export type IgAutomacaoStatus = 'rascunho' | 'ativa' | 'expirada' | 'arquivada'

export type IgRunStatus = 'pendente' | 'enviando' | 'concluido' | 'falhou' | 'interrompido'
export type IgOrigem = 'comentario' | 'direct'

export interface IgAutomacaoRow {
  id: string
  canal_id: string
  agent_id: string
  nome: string
  gatilho: IgGatilho
  midia_id: string | null
  midia_permalink: string | null
  midia_thumb_url: string | null
  story_id: string | null
  permalinks_adicionais: string[]
  midia_ids_adicionais: string[]
  palavras: string[]
  modo_casamento: ModoCasamento
  resposta_publica: boolean
  resposta_publica_texto: string | null
  status: IgAutomacaoStatus
  expira_em: string | null
  disparos: number
  dms_enviadas: number
  respostas_publicas: number
  created_at: string
  updated_at: string
}

export interface IgPassoRow {
  id: string
  automacao_id: string
  posicao: number
  texto: string | null
  imagem_path: string | null
  botoes: BotaoIg[]
  atraso_s: number
  created_at: string
}

export interface IgRunRow {
  id: string
  automacao_id: string
  canal_id: string
  origem: IgOrigem
  origem_id: string
  ig_user_id: string
  ig_username: string | null
  texto_origem: string | null
  palavra_casada: string | null
  status: IgRunStatus
  erro_codigo: string | null
  erro_mensagem: string | null
  
  ultimo_passo_entregue: number | null
  
  recuperacoes: number
  
  repeticoes: number
  created_at: string
  concluido_em: string | null
}


export async function listAutomacoesAtivasPorMidia(
  canalId: string, midiaId: string,
): Promise<IgAutomacaoRow[]> {
  const { data, error } = await serverDb().from('ig_automacoes').select()
    .eq('canal_id', canalId).eq('status', 'ativa').eq('midia_id', midiaId)
  if (error) throw new Error(`listAutomacoesAtivasPorMidia: ${error.message}`)
  return (data ?? []) as IgAutomacaoRow[]
}

export async function getAutomacao(id: string): Promise<IgAutomacaoRow | null> {
  const { data, error } = await serverDb().from('ig_automacoes').select().eq('id', id).maybeSingle()
  if (error) throw new Error(`getAutomacao: ${error.message}`)
  return (data as IgAutomacaoRow) ?? null
}

export async function listPassos(automacaoId: string): Promise<IgPassoRow[]> {
  const { data, error } = await serverDb().from('ig_automacao_passos')
    .select().eq('automacao_id', automacaoId).order('posicao', { ascending: true })
  if (error) throw new Error(`listPassos: ${error.message}`)
  return (data ?? []) as IgPassoRow[]
}

export interface CriarRunInput {
  automacaoId: string
  canalId: string
  origem: IgOrigem
  
  origemId: string
  igUserId: string
  igUsername: string | null
  textoOrigem: string | null
  palavraCasada: string | null
}


export async function criarRun(
  input: CriarRunInput, deps: { db?: typeof serverDb } = {},
): Promise<IgRunRow | null> {
  const db = (deps.db ?? serverDb)()
  const { data, error } = await db.from('ig_automacao_runs').insert({
    automacao_id: input.automacaoId,
    canal_id: input.canalId,
    origem: input.origem,
    origem_id: input.origemId,
    ig_user_id: input.igUserId,
    ig_username: input.igUsername,
    texto_origem: input.textoOrigem,
    palavra_casada: input.palavraCasada,
    status: 'pendente',
  }).select().single()
  if (error) {
    if (error.code === '23505') {
      
      
      
      
      
      
      
      const { error: erroRepeticao } = await db.rpc('ig_marcar_repeticao', {
        p_automacao_id: input.automacaoId,
        p_ig_user_id: input.igUserId,
        p_origem_id: input.origemId,
      })
      if (erroRepeticao) {
        console.warn('[igAutomacoes] contagem da repetição falhou (não-fatal):', erroRepeticao.message)
      }
      return null
    }
    throw new Error(`criarRun: ${error.message}`)
  }
  return data as IgRunRow
}


export const TETO_RETOMADAS_DO_RUN = 3


export async function reclamarRunsOrfaos(corteIso: string, limite: number): Promise<IgRunRow[]> {
  const { data, error } = await serverDb().rpc('ig_reclamar_runs_orfaos', {
    p_corte: corteIso, p_limite: limite,
  })
  if (error) throw new Error(`reclamarRunsOrfaos: ${error.message}`)
  return (data ?? []) as IgRunRow[]
}


export async function devolverRetomadaDoRun(runId: string): Promise<void> {
  const { error } = await serverDb().rpc('ig_devolver_retomada', { p_run_id: runId })
  if (error) throw new Error(`devolverRetomadaDoRun: ${error.message}`)
}

export async function getRun(id: string): Promise<IgRunRow | null> {
  const { data, error } = await serverDb().from('ig_automacao_runs').select().eq('id', id).maybeSingle()
  if (error) throw new Error(`getRun: ${error.message}`)
  return (data as IgRunRow) ?? null
}


export type DesfechoDoRun = Exclude<IgRunStatus, 'pendente' | 'enviando'>


const RUN_VIVO: IgRunStatus[] = ['pendente', 'enviando']


export async function atualizarRun(
  id: string,
  patch: Partial<Pick<IgRunRow, 'erro_codigo' | 'erro_mensagem'>>,
): Promise<void> {
  const { error } = await serverDb().from('ig_automacao_runs')
    .update(patch).eq('id', id).in('status', RUN_VIVO)
  if (error) throw new Error(`atualizarRun: ${error.message}`)
}


export async function marcarDesfechoDoRun(
  id: string,
  patch: { status: DesfechoDoRun } & Partial<Pick<IgRunRow, 'erro_codigo' | 'erro_mensagem' | 'concluido_em'>>,
  deps: { db?: typeof serverDb } = {},
): Promise<boolean> {
  const db = (deps.db ?? serverDb)()
  const { data, error } = await db.from('ig_automacao_runs')
    .update(patch).eq('id', id).in('status', RUN_VIVO).select('id')
  if (error) throw new Error(`marcarDesfechoDoRun: ${error.message}`)
  return (data ?? []).length === 1
}


export async function marcarRunEnviando(
  runId: string, deps: { db?: typeof serverDb } = {},
): Promise<void> {
  const db = (deps.db ?? serverDb)()
  const { error } = await db.from('ig_automacao_runs')
    .update({ status: 'enviando' }).eq('id', runId).eq('status', 'pendente')
  if (error) throw new Error(`marcarRunEnviando: ${error.message}`)
}


export async function marcarPassoEntregue(
  runId: string, passo: number, deps: { db?: typeof serverDb } = {},
): Promise<void> {
  if (!Number.isInteger(passo) || passo < 0) {
    throw new Error(`marcarPassoEntregue: passo inválido`)
  }
  const db = (deps.db ?? serverDb)()
  const { error } = await db.from('ig_automacao_runs')
    .update({ ultimo_passo_entregue: passo })
    .eq('id', runId)
    .or(`ultimo_passo_entregue.is.null,ultimo_passo_entregue.lt.${passo}`)
  if (error) throw new Error(`marcarPassoEntregue: ${error.message}`)
}

export async function incrementarContador(
  automacaoId: string,
  coluna: 'disparos' | 'dms_enviadas' | 'respostas_publicas',
  quanto = 1,
): Promise<void> {
  const { error } = await serverDb().rpc('ig_incrementar_contador', {
    p_automacao_id: automacaoId, p_coluna: coluna, p_quanto: quanto,
  })
  if (error) throw new Error(`incrementarContador: ${error.message}`)
}


export async function listAutomacoesVencidas(agoraIso: string): Promise<IgAutomacaoRow[]> {
  const { data, error } = await serverDb().from('ig_automacoes')
    .select().eq('status', 'ativa').not('expira_em', 'is', null).lte('expira_em', agoraIso)
  if (error) throw new Error(`listAutomacoesVencidas: ${error.message}`)
  return (data ?? []) as IgAutomacaoRow[]
}

export async function marcarExpirada(id: string): Promise<void> {
  const { error } = await serverDb().from('ig_automacoes')
    .update({ status: 'expirada', updated_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'ativa')
  if (error) throw new Error(`marcarExpirada: ${error.message}`)
}




export async function listAutomacoes(canalId: string): Promise<IgAutomacaoRow[]> {
  const { data, error } = await serverDb().from('ig_automacoes')
    .select().eq('canal_id', canalId).neq('status', 'arquivada')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listAutomacoes: ${error.message}`)
  return (data ?? []) as IgAutomacaoRow[]
}

export interface CriarAutomacaoInput {
  canalId: string; agentId: string; nome: string; gatilho: IgGatilho
  midiaId: string | null; midiaPermalink: string | null; midiaThumbUrl: string | null
  storyId: string | null; palavras: string[]; modoCasamento: ModoCasamento
  respostaPublica: boolean; respostaPublicaTexto: string | null
  status: IgAutomacaoStatus; expiraEm: string | null
}

export async function criarAutomacao(input: CriarAutomacaoInput): Promise<IgAutomacaoRow> {
  const { data, error } = await serverDb().from('ig_automacoes').insert({
    canal_id: input.canalId, agent_id: input.agentId, nome: input.nome,
    gatilho: input.gatilho, midia_id: input.midiaId, midia_permalink: input.midiaPermalink,
    midia_thumb_url: input.midiaThumbUrl, story_id: input.storyId,
    palavras: input.palavras, modo_casamento: input.modoCasamento,
    resposta_publica: input.respostaPublica, resposta_publica_texto: input.respostaPublicaTexto,
    status: input.status, expira_em: input.expiraEm,
  }).select().single()
  if (error) throw new Error(`criarAutomacao: ${error.message}`)
  return data as IgAutomacaoRow
}


export type PatchAutomacao = Partial<Pick<IgAutomacaoRow,
  'nome' | 'gatilho' | 'midia_id' | 'midia_permalink' | 'midia_thumb_url' | 'story_id' |
  'palavras' | 'modo_casamento' | 'resposta_publica' | 'resposta_publica_texto' |
  'status' | 'expira_em'
>>

export async function atualizarAutomacao(id: string, patch: PatchAutomacao): Promise<void> {
  const { error } = await serverDb().from('ig_automacoes')
    .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(`atualizarAutomacao: ${error.message}`)
}

export async function arquivarAutomacao(id: string): Promise<void> {
  await atualizarAutomacao(id, { status: 'arquivada' })
}


export async function substituirPassos(
  automacaoId: string,
  passos: Array<{ posicao: number; texto: string | null; imagemPath: string | null; botoes: BotaoIg[]; atrasoS: number }>,
): Promise<void> {
  const { error } = await serverDb().rpc('ig_substituir_passos', {
    p_automacao_id: automacaoId,
    p_passos: passos.map((p) => ({
      posicao: p.posicao, texto: p.texto,
      imagem_path: p.imagemPath, botoes: p.botoes, atraso_s: p.atrasoS,
    })),
  })
  if (error) throw new Error(`substituirPassos: ${error.message}`)
}

export async function listRuns(automacaoId: string, limite = 100): Promise<IgRunRow[]> {
  const { data, error } = await serverDb().from('ig_automacao_runs')
    .select().eq('automacao_id', automacaoId)
    .order('created_at', { ascending: false }).limit(limite)
  if (error) throw new Error(`listRuns: ${error.message}`)
  return (data ?? []) as IgRunRow[]
}


export async function contarAutomacoesDoCanal(
  canalId: string, deps: { db?: typeof serverDb } = {},
): Promise<number> {
  const { count, error } = await (deps.db ?? serverDb)().from('ig_automacoes')
    .select('id', { count: 'exact', head: true }).eq('canal_id', canalId)
  if (error) throw new Error(`contarAutomacoesDoCanal: ${error.message}`)
  if (count == null) throw new Error('contarAutomacoesDoCanal: o banco não devolveu a contagem')
  return count
}


export async function reatribuirAutomacoesDoCanal(canalId: string, agentId: string): Promise<void> {
  const { error } = await serverDb().from('ig_automacoes')
    .update({ agent_id: agentId }).eq('canal_id', canalId).neq('agent_id', agentId)
  if (error) throw new Error(`reatribuirAutomacoesDoCanal: ${error.message}`)
}
