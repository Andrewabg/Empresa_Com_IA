




import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperator } from '@/server/auth/session'
import { getCustomApis } from '@/server/custom/registryApis'
import { encontrarPorSlug } from '@/lib/custom-registry-validate'
import { serverDb } from '@/server/supabase'
import { getSetting } from '@/data/settings'
import type { ApiCustom } from '@/server/custom/contrato'

async function dispatch(method: 'GET' | 'POST', req: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  let user
  try {
    user = await requireOperator(await cookies())
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { slug } = await ctx.params
  let alvo: ApiCustom | null
  try {
    alvo = encontrarPorSlug(getCustomApis(), slug)
  } catch (err) {
    
    
    console.warn('[api custom] registro inválido:', err)
    return NextResponse.json({ error: 'registro custom inválido — corrija custom/api/index.ts' }, { status: 503 })
  }
  if (!alvo) return NextResponse.json({ error: 'endpoint custom não existe' }, { status: 404 })
  const handler = alvo[method]
  if (!handler) return NextResponse.json({ error: `método ${method} não suportado` }, { status: 405 })
  try {
    
    
    
    return await handler(req, { agentId: null, operatorId: user.id, conversationId: null, db: serverDb, getSetting })
  } catch (err) {
    console.warn(`[api custom ${alvo.slug}]`, err)
    return NextResponse.json({ error: 'o endpoint custom falhou' }, { status: 500 })
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  return dispatch('GET', req, ctx)
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  return dispatch('POST', req, ctx)
}
