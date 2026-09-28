
import type { SupabaseClient } from '@supabase/supabase-js'
import { createApproval, getApprovalByPrUrl, type Approval } from '@/data/approvals'
import { parsePrNumber } from '@/server/approvals/github'
import { notificarAprovacao, notificarMemoriaEscaladaPorPush } from '@/server/proativo/producers'


const LIMITE_PADRAO = 10


const RESOLVIDAS = ['created', 'merged']


interface ResultadoDaCandidata {
  title?: string
  path?: string
  body?: string
  reason?: string
  result?: { kind?: string; ref?: string }
}

export interface VarreduraDeps {
  criar?: typeof createApproval
  notificar?: (a: Approval) => void
  limite?: number
}


export async function criarAprovacoesDePrOrfaos(
  db: SupabaseClient,
  deps: VarreduraDeps = {},
): Promise<number> {
  const limite = deps.limite ?? LIMITE_PADRAO
  const criar = deps.criar ?? createApproval
  const notificar = deps.notificar ?? ((a: Approval) => { void notificarAprovacao(a) })

  const { data, error } = await db
    .from('memory_candidates')
    .select('id, result')
    .in('status', RESOLVIDAS)
    .eq('result->result->>kind', 'pr')
    .order('id', { ascending: false })
    .limit(limite)
  if (error) throw new Error(`criarAprovacoesDePrOrfaos select: ${error.message}`)

  const candidatas = (data ?? []) as Array<{ id: number; result: ResultadoDaCandidata | null }>
  
  
  const comPr = candidatas.filter((c) => c.result?.result?.kind === 'pr')
  if (comPr.length === 0) return 0

  const jaTem = await idsComAprovacao(db, comPr.map((c) => c.id))

  let criadas = 0
  for (const c of comPr) {
    if (jaTem.has(c.id)) continue
    try {
      const r = c.result as ResultadoDaCandidata
      const aprovacao = await criar({
        kind: 'brain_pr',
        title: r.title ?? 'Memória aguardando sua aprovação',
        diff: r.body,
        path: r.path,
        pr_url: r.result?.ref,
        pr_number: parsePrNumber(r.result?.ref) ?? undefined,
        agent: 'jarvis',
        reason: motivoDoPedido(r.reason),
        candidate_id: c.id,
      })
      notificar(aprovacao)
      criadas++
    } catch (err) {
      
      console.warn(`[aprovacoesDoCerebro] candidata ${c.id} não virou aprovação:`, err)
    }
  }
  return criadas
}


async function idsComAprovacao(db: SupabaseClient, ids: number[]): Promise<Set<number>> {
  const { data, error } = await db.from('approvals').select('candidate_id').in('candidate_id', ids)
  if (error) throw new Error(`criarAprovacoesDePrOrfaos approvals: ${error.message}`)
  const out = new Set<number>()
  for (const row of (data ?? []) as Array<{ candidate_id: number | null }>) {
    if (row.candidate_id !== null) out.add(row.candidate_id)
  }
  return out
}


export function motivoDoPedido(reasonDoCurador?: string): string {
  const aviso =
    'O Curador abriu este pedido como Pull Request no repositório do Cérebro. Se você já resolveu ele por lá, recuse aqui.'
  
  
  
  
  return reasonDoCurador?.trim() ? `${reasonDoCurador.trim()}\n\n${aviso}` : aviso
}




export const MOTIVO_PUSH_ESCALADO =
  'O envio direto para o repositório do Cérebro falhou, então este conteúdo foi para um Pull Request e está esperando você. Aprovar mescla no Cérebro; recusar descarta. Se você já resolveu no GitHub, recuse aqui.'

export interface PrDoCerebro {
  
  path: string
  
  titulo?: string
  
  corpo?: string
  
  ref?: string
  
  agente?: string
}

export interface RegistrarPrDeps {
  criar?: typeof createApproval
  buscarPorPr?: typeof getApprovalByPrUrl
  notificar?: (a: Approval) => void
  
  avisarSemPedido?: (i: { contexto?: string; ref?: string }) => void
}


export async function registrarPrDoCerebro(
  pr: PrDoCerebro,
  deps: RegistrarPrDeps = {},
): Promise<Approval | null> {
  const criar = deps.criar ?? createApproval
  const buscar = deps.buscarPorPr ?? getApprovalByPrUrl
  const notificar = deps.notificar ?? ((a: Approval) => { void notificarAprovacao(a) })
  const avisar =
    deps.avisarSemPedido ??
    ((i: { contexto?: string; ref?: string }) => { void notificarMemoriaEscaladaPorPush(i) })

  try {
    const numero = parsePrNumber(pr.ref)
    if (numero === null || numero === undefined) {
      console.warn(`[aprovacoesDoCerebro] escalada sem número de PR (${pr.ref ?? 'sem ref'}) em ${pr.path}`)
      avisar({ contexto: pr.path, ref: pr.ref })
      return null
    }

    
    
    
    if (pr.ref && (await buscar(pr.ref))) return null

    const aprovacao = await criar({
      kind: 'brain_pr',
      title: pr.titulo?.trim() || pr.path,
      diff: pr.corpo,
      path: pr.path,
      pr_url: pr.ref,
      pr_number: numero,
      agent: pr.agente ?? 'jarvis',
      reason: MOTIVO_PUSH_ESCALADO,
    })
    notificar(aprovacao)
    return aprovacao
  } catch (err) {
    
    console.warn(`[aprovacoesDoCerebro] não consegui registrar o PR de ${pr.path}:`, err)
    try { avisar({ contexto: pr.path, ref: pr.ref }) } catch {  }
    return null
  }
}
