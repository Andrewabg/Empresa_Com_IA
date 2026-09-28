
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { listRuns, getAutomacao } from '@/data/igAutomacoes'
import { TEXTOS_ROTA_IG } from '@/lib/instagram/copyRota'

export async function GET(_r: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const auth = await requireOperatorApi(await cookies())
    if (auth instanceof Response) return auth
    const { id } = await ctx.params
    const automacao = await getAutomacao(id)
    if (!automacao) return Response.json({ error: TEXTOS_ROTA_IG.naoEncontrada }, { status: 404 })
    return Response.json({ runs: await listRuns(id) })
  } catch (e) {
    
    
    console.warn('[instagram/automacoes/[id]/runs] GET falhou:', e)
    return Response.json({ error: TEXTOS_ROTA_IG.falhaHistorico }, { status: 500 })
  }
}
