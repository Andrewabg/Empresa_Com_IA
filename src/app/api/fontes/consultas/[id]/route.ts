
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { aprovarConsulta, alternarConsulta, apagarConsulta, getConsulta } from '@/data/fontes'


import {
  CONSULTA_NADA_PARA_MUDAR,
  ERRO_CONSULTA_NAO_ENCONTRADA,
  ERRO_MUDAR_CONSULTA,
  ERRO_REMOVER_CONSULTA,
} from '@/server/fontes/copyDasRotas'

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.aprovar !== true && typeof body.ativa !== 'boolean') {
    return Response.json({ error: CONSULTA_NADA_PARA_MUDAR }, { status: 400 })
  }

  try {
    if (!(await getConsulta(id))) return Response.json({ error: ERRO_CONSULTA_NAO_ENCONTRADA }, { status: 404 })

    
    
    if (body.aprovar === true) await aprovarConsulta(id, auth.user.id, new Date().toISOString())
    if (typeof body.ativa === 'boolean') await alternarConsulta(id, body.ativa)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/fontes/consultas/[id]]', err)
    return Response.json({ error: ERRO_MUDAR_CONSULTA }, { status: 500 })
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params
  try {
    await apagarConsulta(id)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/fontes/consultas/[id]]', err)
    return Response.json({ error: ERRO_REMOVER_CONSULTA }, { status: 500 })
  }
}
