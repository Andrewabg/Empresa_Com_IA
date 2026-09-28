import { serverDb } from '../server/supabase'
import { recordEvent } from './events'
import { idDoEventoDeCriacao, rotuloDaCriacao } from '@/lib/aprovacoes/eventoDeCriacao'
import { SLUGS_ESCRITA_META, projetarAcoesDoLedger, type AcaoMetaLedger } from '@/lib/trafego/estabilizacao'
import { listResultadosPorApprovals, rowParaResultado } from './acaoResultados'
import type { ResultadoAcao } from '@/lib/trafego/atribuicao'
import type { DesfechoRecente } from '@/lib/briefing/tipos'

export type ApprovalKind = 'brain_pr' | 'tool_action' | 'plan' | 'directive' | 'custom_tool'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface Approval {
  id: string
  kind: ApprovalKind
  title: string | null
  diff: string | null
  path: string | null
  pr_url: string | null
  pr_number: number | null
  agent: string | null
  reason: string | null
  status: ApprovalStatus
  candidate_id: number | null
  created_at: string
  resolved_at: string | null
  action_slug: string | null
  action_args: Record<string, unknown> | null
  task_id: string | null
  plan_id: string | null
  conversa_id: string | null
  contato_id: string | null
  canal_id: string | null
  
  conversation_id: string | null
  
  telegram_chat_id: string | null
  telegram_message_id: number | null
}

export interface CreateApprovalInput {
  kind?: ApprovalKind
  title?: string
  diff?: string
  path?: string
  pr_url?: string
  pr_number?: number
  agent?: string
  reason?: string
  candidate_id?: number
  action_slug?: string
  action_args?: Record<string, unknown>
  plan_id?: string
  conversa_id?: string | null
  contato_id?: string | null
  canal_id?: string | null
  conversation_id?: string | null
}

export async function createApproval(input: CreateApprovalInput): Promise<Approval> {
  const db = serverDb()
  const { data, error } = await db
    .from('approvals')
    .insert({
      kind: input.kind ?? 'brain_pr',
      title: input.title ?? null,
      diff: input.diff ?? null,
      path: input.path ?? null,
      pr_url: input.pr_url ?? null,
      pr_number: input.pr_number ?? null,
      agent: input.agent ?? null,
      reason: input.reason ?? null,
      candidate_id: input.candidate_id ?? null,
      action_slug: input.action_slug ?? null,
      action_args: input.action_args ?? null,
      plan_id: input.plan_id ?? null,
      conversa_id: input.conversa_id ?? null,
      contato_id: input.contato_id ?? null,
      canal_id: input.canal_id ?? null,
      conversation_id: input.conversation_id ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(`createApproval: ${error.message}`)
  const approval = data as Approval

  
  
  
  
  
  try {
    await recordEvent({
      id: idDoEventoDeCriacao(approval.id),
      type: 'action',
      label: rotuloDaCriacao(approval.kind, approval.title),
      agent: approval.agent ?? 'jarvis',
    })
  } catch (err) {
    console.warn('[createApproval] recordEvent falhou (não-fatal):', err)
  }

  return approval
}

export async function listPending(): Promise<Approval[]> {
  const db = serverDb()
  const { data, error } = await db
    .from('approvals')
    .select()
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw new Error(`listPending: ${error.message}`)
  return (data ?? []) as Approval[]
}


export async function countPending(): Promise<number> {
  const db = serverDb()
  const { count, error } = await db
    .from('approvals')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (error) throw new Error(`countPending: ${error.message}`)
  return count ?? 0
}


export async function getApproval(id: string): Promise<Approval | null> {
  const db = serverDb()
  const { data, error } = await db
    .from('approvals')
    .select()
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`getApproval: ${error.message}`)
  return (data as Approval | null) ?? null
}


export async function getApprovalByPrUrl(prUrl: string): Promise<Approval | null> {
  const db = serverDb()
  const { data, error } = await db
    .from('approvals')
    .select()
    .eq('pr_url', prUrl)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(`getApprovalByPrUrl: ${error.message}`)
  return ((data ?? [])[0] as Approval | undefined) ?? null
}


export async function getApprovalByCandidateId(candidateId: number): Promise<Approval | null> {
  const db = serverDb()
  const { data, error } = await db
    .from('approvals')
    .select()
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(`getApprovalByCandidateId: ${error.message}`)
  return ((data ?? [])[0] as Approval | undefined) ?? null
}

export async function linkApprovalToTask(approvalId: string, taskId: string, agentId: string): Promise<void> {
  const { error } = await serverDb()
    .from('approvals')
    .update({ task_id: taskId, agent: agentId })
    .eq('id', approvalId)
  if (error) throw new Error(`linkApprovalToTask: ${error.message}`)
}

export async function setStatus(
  id: string,
  status: 'approved' | 'rejected',
): Promise<Approval> {
  const db = serverDb()
  const { data, error } = await db
    .from('approvals')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`setStatus: ${error.message}`)
  return data as Approval
}


export async function updateApprovalArgs(
  id: string,
  action_args: Record<string, unknown>,
): Promise<Approval> {
  const { data, error } = await serverDb()
    .from('approvals')
    .update({ action_args })
    .eq('id', id)
    .eq('status', 'pending')
    .select()
    .single()
  if (error) throw new Error(`updateApprovalArgs: ${error.message}`)
  return data as Approval
}


export async function claimResolucao(
  id: string,
  status: 'approved' | 'rejected',
): Promise<Approval | null> {
  const db = serverDb()
  const { data, error } = await db
    .from('approvals')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select()
  if (error) throw new Error(`claimResolucao: ${error.message}`)
  return data && data.length === 1 ? (data[0] as Approval) : null
}


export async function reverterResolucaoParaPending(id: string, mensagem: string): Promise<void> {
  const db = serverDb()
  const atual = await getApproval(id)
  const reason = [atual?.reason, `falha de autenticação Composio — reabrir após corrigir a chave em /config: ${mensagem}`]
    .filter(Boolean).join(' | ')
  const { error } = await db
    .from('approvals')
    .update({ status: 'pending', resolved_at: null, reason })
    .eq('id', id)
    .eq('status', 'approved')
  if (error) throw new Error(`reverterResolucaoParaPending: ${error.message}`)
}



export async function registrarMotivoDaPendencia(id: string, mensagem: string): Promise<void> {
  const db = serverDb()
  const atual = await getApproval(id)
  if (atual?.reason?.includes(mensagem)) return
  const reason = [atual?.reason, mensagem].filter(Boolean).join(' | ')
  const { error } = await db.from('approvals').update({ reason }).eq('id', id)
  if (error) throw new Error(`registrarMotivoDaPendencia: ${error.message}`)
}


export async function registrarMensagemTelegram(id: string, chatId: string, messageId: number): Promise<void> {
  const { error } = await serverDb()
    .from('approvals')
    .update({ telegram_chat_id: chatId, telegram_message_id: messageId })
    .eq('id', id)
  if (error) throw new Error(`registrarMensagemTelegram: ${error.message}`)
}

export async function registrarErroResolucao(id: string, mensagem: string): Promise<void> {
  const db = serverDb()
  const atual = await getApproval(id)
  const reason = [atual?.reason, `erro pós-claim: ${mensagem}`].filter(Boolean).join(' | ')
  const { error } = await db.from('approvals').update({ reason }).eq('id', id)
  if (error) throw new Error(`registrarErroResolucao: ${error.message}`)
}


export async function listAcoesMetaRecentes(desdeISO: string): Promise<AcaoMetaLedger[]> {
  const db = serverDb()
  const { data, error } = await db
    .from('approvals')
    .select('id, action_slug, action_args, status, created_at')
    .eq('kind', 'tool_action')
    .in('action_slug', [...SLUGS_ESCRITA_META])
    .gte('created_at', desdeISO)
    .order('created_at', { ascending: true })
  if (error) {
    console.warn('[listAcoesMetaRecentes] leitura do ledger falhou (não-fatal):', error.message)
    return []
  }
  const rows = (data ?? []) as { id: string; action_slug: string | null; action_args: Record<string, unknown> | null; status: string; created_at: string }[]
  
  const approvalIds = [...new Set(rows.map((r) => r.id))]
  const resultados = await listResultadosPorApprovals(approvalIds)
  const mapa = new Map<string, ResultadoAcao>()
  for (const r of resultados) mapa.set(`${r.approval_id}:${r.entity_id}`, rowParaResultado(r))
  return projetarAcoesDoLedger(rows, mapa)
}


export async function listResolvidasRecentes(desdeISO: string): Promise<DesfechoRecente[]> {
  const db = serverDb()
  const { data, error } = await db
    .from('approvals')
    .select('title, status')
    .in('status', ['approved', 'rejected'])
    .gte('resolved_at', desdeISO)
    .order('resolved_at', { ascending: false })
    .limit(5)
  if (error) {
    console.warn('[listResolvidasRecentes] leitura falhou (não-fatal):', error.message)
    return []
  }
  return (data ?? [])
    .map((r) => ({
      titulo: ((r.title as string | null) ?? '').trim(),
      status: (r.status === 'approved' ? 'aprovada' : 'rejeitada') as 'aprovada' | 'rejeitada',
    }))
    .filter((r) => r.titulo.length > 0)
}


export interface AcaoMaduraParaMedir { approvalId: string; entityId: string; slug: string; resolvedAt: string }


export async function listAcoesOrcamentoMaduras(desdeISO: string, ateISO: string): Promise<AcaoMaduraParaMedir[]> {
  const db = serverDb()
  const { data, error } = await db
    .from('approvals')
    .select('id, action_slug, action_args, status, created_at, resolved_at')
    .eq('kind', 'tool_action')
    .eq('status', 'approved')
    .in('action_slug', [...SLUGS_ESCRITA_META])
    .gte('resolved_at', desdeISO)
    .lte('resolved_at', ateISO)
  if (error) { console.warn('[listAcoesOrcamentoMaduras] fail-open:', error.message); return [] }
  const rows = (data ?? []) as { id: string; action_slug: string | null; action_args: Record<string, unknown> | null; status: string; created_at: string; resolved_at: string | null }[]
  const resolvedPorId = new Map(rows.map((r) => [r.id, r.resolved_at ?? '']))
  const slugPorId = new Map(rows.map((r) => [r.id, r.action_slug ?? '']))
  const projetadas = projetarAcoesDoLedger(rows.map((r) => ({ id: r.id, action_slug: r.action_slug, action_args: r.action_args, status: r.status, created_at: r.created_at })))
  const out: AcaoMaduraParaMedir[] = []
  for (const a of projetadas) {
    if (a.tipo !== 'orcamento') continue 
    const resolvedAt = resolvedPorId.get(a.approvalId)
    if (!resolvedAt) continue
    out.push({ approvalId: a.approvalId, entityId: a.entityId, slug: slugPorId.get(a.approvalId) ?? '', resolvedAt })
  }
  return out
}
