
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { mesmaOrigem } from '@/server/auth/mesmaOrigem'
import { alternarFonte, apagarFonte, getFonte } from '@/data/fontes'
import { deleteSecret } from '@/server/secrets'


import {
  FONTE_NADA_PARA_MUDAR,
  ERRO_ALTERNAR_FONTE,
  ERRO_REMOVER_FONTE,
  ERRO_FONTE_NAO_ENCONTRADA_ALTERNAR,
  ERRO_ORIGEM_NAO_PERMITIDA,
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
  
  
  if (typeof body.ativa !== 'boolean') {
    return Response.json({ error: FONTE_NADA_PARA_MUDAR }, { status: 400 })
  }

  try {
    
    
    
    if (!(await alternarFonte(id, body.ativa))) {
      return Response.json({ error: ERRO_FONTE_NAO_ENCONTRADA_ALTERNAR }, { status: 404 })
    }
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/fontes/[id]]', err)
    return Response.json({ error: ERRO_ALTERNAR_FONTE }, { status: 500 })
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  
  
  if (!mesmaOrigem(request)) {
    return Response.json({ error: ERRO_ORIGEM_NAO_PERMITIDA }, { status: 403 })
  }
  const { id } = await ctx.params
  try {
    
    
    
    
    
    
    
    
    const fonte = await getFonte(id)
    
    if (!fonte) return Response.json({ ok: true })
    await deleteSecret(fonte.secret_ref)
    await apagarFonte(id)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/fontes/[id]]', err)
    return Response.json({ error: ERRO_REMOVER_FONTE }, { status: 500 })
  }
}
