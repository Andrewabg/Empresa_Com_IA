








import { proximaExecucao, proximaExecucaoAte, passouDoTermino } from '@/lib/rotinas/agenda'
import {
  listarVencidas as listarVencidasDefault,
  claimExecucao as claimExecucaoDefault,
  registrarTask as registrarTaskDefault,
  encerrarRotina as encerrarRotinaDefault,
  agendaDaRotina,
  type RotinaRow,
} from '@/data/rotinas'
import { createTask, type TaskRow, type CreateTaskInput } from '@/data/tasks'
import { getAgentRow } from '@/data/agents'
import { getSetting } from '@/data/settings'
import { validarTz, TZ_DEFAULT } from '@/server/proativo/dispatcher'
import { listarMembros as listarMembrosDefault, type MembroRow } from '@/data/equipe'
import { getBoundOperatorId } from '@/server/auth/operatorIdentity'
import { serverDb } from '@/server/supabase'
import { createLimiter } from '@/lib/concurrency'
import { DEFAULT_POOL as DEFAULT_POOL_DO_EXECUTOR } from '@/server/agent/executor/heartbeat'

export interface RotinasHeartbeatDeps {
  listarVencidas: (agoraIso: string) => Promise<RotinaRow[]>
  
  claim: (id: string, esperada: string, nova: string, agoraIso: string, encerrar?: boolean) => Promise<boolean>
  
  encerrar: (id: string, agoraIso: string) => Promise<boolean>
  criarTask: (input: CreateTaskInput) => Promise<TaskRow>
  registrarTask: (id: string, taskId: string) => Promise<void>
  agenteAtivo: (agentId: string) => Promise<boolean>
  getTz: () => Promise<string>
  now: () => string
  fire: (taskId: string) => void
  
  listarMembros: () => Promise<MembroRow[]>
  
  donoFundador: () => Promise<string | null>
}

export interface RotinasResultado {
  
  disparadas: number
  
  puladas: number
  
  encerradas: number
  falhas: number
}


export function criarFireLimitado(
  runTaskFn: (taskId: string) => Promise<void>,
  pool: number = DEFAULT_POOL_DO_EXECUTOR,
): (taskId: string) => void {
  const limiter = createLimiter(pool)
  return (taskId) => {
    void limiter.run(() => runTaskFn(taskId)).catch((e) => console.warn('[rotinas] fire falhou (não-fatal):', e))
  }
}

async function defaultDeps(): Promise<RotinasHeartbeatDeps> {
  const { runTask } = await import('@/server/agent/executor/runTask')
  return {
    listarVencidas: (agora) => listarVencidasDefault(agora),
    claim: claimExecucaoDefault,
    encerrar: encerrarRotinaDefault,
    criarTask: createTask,
    registrarTask: registrarTaskDefault,
    agenteAtivo: async (id) => (await getAgentRow(id))?.enabled === true,
    getTz: async () => validarTz((await getSetting('operator_timezone')) ?? TZ_DEFAULT),
    now: () => new Date().toISOString(),
    fire: criarFireLimitado(runTask),
    listarMembros: listarMembrosDefault,
    donoFundador: async () => getBoundOperatorId(serverDb()),
  }
}

export async function runRotinasHeartbeat(deps?: RotinasHeartbeatDeps): Promise<RotinasResultado> {
  const d = deps ?? (await defaultDeps())
  const out: RotinasResultado = { disparadas: 0, puladas: 0, encerradas: 0, falhas: 0 }
  let vencidas: RotinaRow[]
  try {
    vencidas = await d.listarVencidas(d.now())
  } catch (e) {
    console.warn('[rotinas] leitura fail-open:', e)
    return out
  }
  if (!vencidas.length) return out

  const tz = await d.getTz().catch(() => TZ_DEFAULT)
  
  
  
  
  
  const membros = await d.listarMembros().catch((e) => { console.warn('[rotinas] listarMembros fail-open:', e); return [] as MembroRow[] })
  const donoDaEquipe = membros.find((m) => m.papel === 'dono')?.user_id ?? null
  
  
  const donoId = donoDaEquipe
    ?? (await d.donoFundador().catch((e) => { console.warn('[rotinas] donoFundador fail-open:', e); return null }))

  for (const r of vencidas) {
    try {
      const agora = d.now()
      const agenda = agendaDaRotina(r)

      
      
      
      if (passouDoTermino(r.proxima_execucao, agenda.terminaEm, tz)) {
        if (await d.encerrar(r.id, agora)) out.encerradas++
        continue
      }

      
      
      
      const dentro = proximaExecucaoAte(agenda, agora, tz)
      const ultima = dentro === null
      const proxima = dentro ?? proximaExecucao(agenda, agora, tz)
      const venceu = await d.claim(r.id, r.proxima_execucao, proxima, agora, ultima)
      if (!venceu) continue 
      if (ultima) out.encerradas++

      
      
      
      if (!(await d.agenteAtivo(r.agent_id))) { out.puladas++; continue }

      const task = await d.criarTask({ agent_id: r.agent_id, objective: r.pedido, operator_id: donoId })
      
      
      try { await d.registrarTask(r.id, task.id) }
      catch (e) { console.warn('[rotinas] carimbo da tarefa falhou (não-fatal):', e) }
      d.fire(task.id)
      out.disparadas++
    } catch (e) {
      console.warn('[rotinas] rotina falhou (fail-open):', r.id, e)
      out.falhas++
    }
  }
  return out
}
