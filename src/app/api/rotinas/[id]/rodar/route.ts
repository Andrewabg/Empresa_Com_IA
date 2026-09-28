
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getRotina, registrarTask } from '@/data/rotinas'
import { getAgentRow } from '@/data/agents'
import { createTask } from '@/data/tasks'
import { runTask } from '@/server/agent/executor/runTask'

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  const { id } = await ctx.params
  try {
    const rotina = await getRotina(id)
    if (!rotina) return Response.json({ error: 'Rotina não encontrada.' }, { status: 404 })

    const agente = await getAgentRow(rotina.agent_id)
    if (!agente) return Response.json({ error: 'O agente desta rotina não existe mais.' }, { status: 409 })
    if (!agente.enabled) {
      return Response.json({ error: `${agente.name} está desligado — ligue no /agentes antes de rodar.` }, { status: 409 })
    }

    
    
    
    const task = await createTask({ agent_id: rotina.agent_id, objective: rotina.pedido, operator_id: auth.user.id })
    try { await registrarTask(rotina.id, task.id) }
    catch (e) { console.warn('[POST /api/rotinas/[id]/rodar] carimbo falhou (não-fatal):', e) }
    
    
    void runTask(task.id).catch((e) => console.warn('[POST /api/rotinas/[id]/rodar] fire falhou:', e))

    return Response.json({ ok: true, taskId: task.id })
  } catch (err) {
    console.error('[POST /api/rotinas/[id]/rodar]', err)
    return Response.json({ error: 'Não consegui iniciar a rotina agora.' }, { status: 500 })
  }
}
