
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { listarFamiliaDaTarefa } from '@/data/tasks'
import { cancelObjective } from '@/server/agent/maestro/cancel'
import { COPY_TAREFAS } from '@/lib/tarefas/copy'

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params
  try {
    const familia = await listarFamiliaDaTarefa(id)
    if (familia.length === 0) return Response.json({ error: 'not_found' }, { status: 404 })
    await cancelObjective(familia[0].id)
    return Response.json({ ok: true, mensagem: COPY_TAREFAS.cancelado })
  } catch (err) {
    console.error('[POST /api/tarefas/[id]/cancelar]', err)
    return Response.json({ error: COPY_TAREFAS.falhaAoCancelar }, { status: 500 })
  }
}
