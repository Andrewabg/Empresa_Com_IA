
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { listarFamiliaDaTarefa } from '@/data/tasks'
import { listarTransicoes } from '@/data/taskTransitions'
import { montarArvore, type TarefaCrua, type TransicaoCrua } from '@/lib/tarefas/linhaDoTempo'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params
  try {
    
    
    
    const familia = await listarFamiliaDaTarefa(id)
    if (familia.length === 0) return Response.json({ error: 'not_found' }, { status: 404 })
    const transicoes = await listarTransicoes(familia.map((t) => t.id))
    const arvore = montarArvore(
      familia as unknown as TarefaCrua[],
      transicoes as unknown as TransicaoCrua[],
      Date.now(),
    )
    return Response.json({ arvore })
  } catch (err) {
    console.error('[GET /api/tarefas/[id]]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
