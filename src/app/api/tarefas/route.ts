
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { listarObjetivosRecentes, listarStatusDosFilhos } from '@/data/tasks'
import { sinaisPorObjetivo } from '@/lib/tarefas/filtro'
import type { StatusTarefa } from '@/lib/tarefas/linhaDoTempo'

export async function GET() {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    const objetivos = await listarObjetivosRecentes()
    const filhos = await listarStatusDosFilhos(objetivos.map((o) => o.id))
    return Response.json({
      objetivos,
      sinais: sinaisPorObjetivo(objetivos as Array<{ id: string; status: StatusTarefa }>, filhos),
    })
  } catch (err) {
    console.error('[GET /api/tarefas]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
