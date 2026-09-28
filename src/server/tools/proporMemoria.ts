
import { enqueueCandidate } from '../../brain/curator/candidates'
import type { OrigemCandidata } from '@/lib/memory/origemDaCandidata'
import {
  marcarInelegiveisComoDescartadas,
  portaoFechou,
  type ResultadoDoPortao,
} from '../brain/candidatasElegiveis'
import { reconcileResilient } from '../brain/reconcileResilient'
import { withCloneLock } from '../brain/cloneLock'
import { createApproval, getApprovalByCandidateId } from '../../data/approvals'
import { recordEvent } from '../../data/events'
import { notificarAprovacao } from '../proativo/producers'
import { resultadoIgnorado, type ResultadoIgnorado } from '@/lib/memory/motivoDoCurador'
import type { getBrain } from '../brain/runtime'

type Brain = Awaited<ReturnType<typeof getBrain>>


export const PORTAO_NAO_FECHOU =
  'Não consegui conferir de onde veio o que está esperando para virar memória, então parei antes '
  + 'de gravar no seu Cérebro, para não guardar como verdade da sua empresa algo que veio de fora. '
  + 'Parte do que você pediu pode já ter sido guardada na ficha da sua empresa. Pode me pedir de '
  + 'novo sem duplicar nada: a nota no Cérebro não chegou a ser criada.'

export interface ProporMemoriaDeps {
  
  marcarInelegiveis?: () => Promise<ResultadoDoPortao>
  
  origem?: OrigemCandidata
}

export interface ProporMemoriaInput {
  título: string
  conteúdo: string
  tipo: string
  tags?: string[]
}

export type ProporMemoriaResult =
  | { status: 'committed'; stale_index?: true }
  | { status: 'pending_approval'; approvalId: string }
  | ResultadoIgnorado


type ApplyResult = { kind: 'noop' | 'commit' | 'pr'; ref?: string }


function parsePrNumber(ref: string | undefined): number | null {
  if (!ref) return null
  const m = ref.match(/\/pull\/(\d+)/)
  return m ? Number(m[1]) : null
}

export async function proporMemoria(
  input: ProporMemoriaInput,
  brain?: Brain,
  deps: ProporMemoriaDeps = {},
): Promise<ProporMemoriaResult> {
  const b = brain ?? (await (await import('../brain/runtime')).getBrain())
  const db = b.db
  const marcarInelegiveis = deps.marcarInelegiveis ?? (() => marcarInelegiveisComoDescartadas(db))

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  try {
    const portao = await marcarInelegiveis()
    if (!portaoFechou(portao)) {
      throw new Error(`portão não fechou: leu=${portao.leu}, ${portao.marcadas} de ${portao.recusas.length} marcadas`)
    }
  } catch (e) {
    console.warn('[proporMemoria] portão de origem não fechou; nada foi enfileirado:', e)
    throw new Error(PORTAO_NAO_FECHOU)
  }

  
  
  const raw_content = input.título ? `# ${input.título}\n\n${input.conteúdo}` : input.conteúdo
  const { data: cand, error: enqErr } = await enqueueCandidate(db, {
    source_type: 'conversation',
    raw_content,
    suggested_type: input.tipo,
    suggested_tags: input.tags ?? [],
    author_agent: 'jarvis',
    status: 'pending',
    
    
    
    
    
    
    
    
    origin_class: deps.origem ?? 'agente',
  })
    .select()
    .single()
  if (enqErr) throw new Error(`proporMemoria enqueue: ${enqErr.message}`)


  
  
  await b.curator.run()

  
  const { data: done, error: readErr } = await db
    .from('memory_candidates')
    .select('status,result')
    .eq('id', cand.id)
    .single()
  if (readErr) throw new Error(`proporMemoria re-read candidate: ${readErr.message}`)

  const decision = (done?.result ?? {}) as { result?: ApplyResult; noteId?: string; title?: string; path?: string; body?: string; reason?: string }
  const r = decision.result

  
  if (r?.kind === 'commit') {
    
    const commitEventId = 'mem:' + (decision.path ?? decision.noteId ?? String(cand.id)) + ':' + (r.ref ?? '')
    try {
      
      
      
      
      await withCloneLock(() => reconcileResilient(db, b.repo, b.sync, b.embedder.version()))
    } catch {
      
      try {
        await recordEvent({
          id: commitEventId,
          type: 'memory',
          label: 'Memória registrada: ' + (decision.title ?? input.título),
          agent: 'jarvis',
        })
      } catch (err) {
        console.warn('[proporMemoria] recordEvent falhou (não-fatal):', err)
      }
      return { status: 'committed', stale_index: true }
    }
    try {
      await recordEvent({
        id: commitEventId,
        type: 'memory',
        label: 'Memória registrada: ' + (decision.title ?? input.título),
        agent: 'jarvis',
      })
    } catch (err) {
      console.warn('[proporMemoria] recordEvent falhou (não-fatal):', err)
    }
    return { status: 'committed' }
  }

  
  if (r?.kind === 'pr') {
    
    
    
    const existente = await getApprovalByCandidateId(cand.id)
    if (existente) return { status: 'pending_approval', approvalId: existente.id }
    const approval = await createApproval({
      kind: 'brain_pr',
      title: decision.title ?? input.título,
      diff: decision.body ?? input.conteúdo,
      path: decision.path,
      pr_url: r.ref,
      pr_number: parsePrNumber(r.ref) ?? undefined,
      agent: 'jarvis',
      reason: decision.reason,
      candidate_id: cand.id,
    })
    void notificarAprovacao(approval) 
    
    return { status: 'pending_approval', approvalId: approval.id }
  }

  
  
  
  return resultadoIgnorado(decision.reason)
}
