



























import type { RecentMessage } from '@/data/messages'
import { listRecentMessages } from '@/data/messages'
import { assembleStableMemory, assembleRecallMemory } from '@/server/memory/inject'
import { AMBIENT_RECALL_K } from '@/lib/memory/recallBudget'
import { listAgents } from '@/data/agents'
import { renderRoster } from '@/lib/roster'
import { getSetting } from '@/data/settings'
import { blocoRelogio, tzSegura } from '@/lib/relogio'
import { precisaRecall } from '@/lib/memory/recallGate'
import { falaAnteriorDoUsuario } from '@/lib/memory/consultaDeRecall'
import { BUFFER_MESSAGES, FETCH_MESSAGES } from '@/lib/memory/historyWindow'
import { deveInjetarResumo, renderResumoRetomada } from '@/lib/memory/resumoRetomada'
import { latestEpisodicSummary } from '@/data/episodicMemory'
import { serverDb } from '@/server/supabase'


const RECALL_K = AMBIENT_RECALL_K


export interface HistoricoMsg {
  role: 'user' | 'assistant'
  content: string
}


export interface ContextoConselheiro {
  
  rosterBlock?: string
  
  memoryBlock?: string
  
  suffixContext?: string
  
  history: HistoricoMsg[]
  
  resumoRetomada?: string
  
  tz: string
}


export interface MontarContextoDeps {
  
  listRecentMessages: (conversationId: string, n: number) => Promise<RecentMessage[]>
  
  assembleStableMemory: (args: { operatorId: string }) => Promise<string>
  
  assembleRecallMemory: (userText: string, k: number, falaAnterior?: string) => Promise<string>
  
  renderRosterBlock: () => Promise<string>
  
  getTz: () => Promise<string>
  
  precisaRecall: (userText: string) => boolean
  
  carregarResumoConversa: (conversationId: string) => Promise<string | null>
}


export function defaultMontarContextoDeps(): MontarContextoDeps {
  return {
    listRecentMessages,
    assembleStableMemory,
    assembleRecallMemory: (userText, k, falaAnterior) => assembleRecallMemory(userText, k, { falaAnterior }),
    renderRosterBlock: async () => renderRoster(await listAgents()),
    getTz: async () => tzSegura(await getSetting('operator_timezone')),
    precisaRecall,
    carregarResumoConversa: (id) => latestEpisodicSummary(serverDb(), id),
  }
}


function filtrarValidas(rows: RecentMessage[]): HistoricoMsg[] {
  return rows
    .filter(
      (m) => (m.role === 'user' || m.role === 'assistant') && !!m.content?.trim(),
    )
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content as string }))
}


export async function montarContextoConselheiro(
  args: {
    operatorId: string
    conversationId: string
    userText: string
    incluirRoster?: boolean
    now?: string
  },
  deps: MontarContextoDeps = defaultMontarContextoDeps(),
): Promise<ContextoConselheiro> {
  const { operatorId, conversationId, userText } = args
  const incluirRoster = args.incluirRoster !== false
  const now = args.now ?? new Date().toISOString()

  
  
  const querRecall = deps.precisaRecall(userText)

  
  
  const rosterP: Promise<string | undefined> = incluirRoster
    ? deps
        .renderRosterBlock()
        .then((s) => s || undefined)
        .catch((e) => {
          console.warn('[montarContextoConselheiro] roster falhou (fail-open):', e)
          return undefined
        })
    : Promise.resolve(undefined)

  const memoryP: Promise<string | undefined> = deps
    .assembleStableMemory({ operatorId })
    .then((s) => s || undefined)
    .catch((e) => {
      console.warn('[montarContextoConselheiro] memória estável falhou (fail-open):', e)
      return undefined
    })

  
  
  const historyP: Promise<HistoricoMsg[]> = deps
    .listRecentMessages(conversationId, FETCH_MESSAGES)
    .then(filtrarValidas)
    .catch((e) => {
      console.warn('[montarContextoConselheiro] histórico falhou (fail-open):', e)
      return [] as HistoricoMsg[]
    })

  
  
  
  
  
  const recallP: Promise<string | undefined> = querRecall
    ? historyP
        .then((validas) => deps.assembleRecallMemory(userText, RECALL_K, falaAnteriorDoUsuario(validas, userText)))
        .then((s) => s || undefined)
        .catch((e) => {
          console.warn('[montarContextoConselheiro] recall falhou (fail-open):', e)
          return undefined
        })
    : Promise.resolve(undefined)

  
  
  
  
  const tzP: Promise<string> = deps.getTz().catch(() => tzSegura(null)).then((tz) => tzSegura(tz))
  const clockP: Promise<string | undefined> = tzP.then((tz) => blocoRelogio(now, tz)).catch(() => undefined)

  const [rosterBlock, memoryBlock, recallBlock, clockBlock, validas, tz] = await Promise.all([
    rosterP,
    memoryP,
    recallP,
    clockP,
    historyP,
    tzP,
  ])

  const history = validas.slice(-BUFFER_MESSAGES)

  
  
  let resumoRetomada: string | undefined
  if (deveInjetarResumo(validas.length, BUFFER_MESSAGES)) {
    try {
      const s = await deps.carregarResumoConversa(conversationId)
      const bloco = s ? renderResumoRetomada(s) : ''
      if (bloco) resumoRetomada = bloco
    } catch (e) {
      console.warn('[montarContextoConselheiro] resumo de retomada fail-open:', e)
    }
  }

  
  
  const suffixContext = [recallBlock, clockBlock].filter(Boolean).join('\n\n') || undefined

  return { rosterBlock, memoryBlock, suffixContext, history, resumoRetomada, tz }
}
