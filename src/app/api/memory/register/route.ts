import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { registerMemory } from '@/server/memory/registerMemory'
import { NotConfiguredError } from '@/server/brain/runtime'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  let body: { título?: unknown; conteúdo?: unknown; tipo?: unknown; tags?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const título = typeof body.título === 'string' ? body.título.trim() : ''
  const conteúdo = typeof body.conteúdo === 'string' ? body.conteúdo.trim() : ''
  const tipo = typeof body.tipo === 'string' && body.tipo.trim() ? body.tipo.trim() : 'semantic'
  if (!título || !conteúdo) {
    return Response.json({ error: 'título e conteúdo são obrigatórios' }, { status: 400 })
  }
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === 'string')
    : undefined

  try {
    const result = await registerMemory({ título, conteúdo, tipo, tags })
    return Response.json(result)
  } catch (err) {
    if (err instanceof NotConfiguredError) {
      return Response.json({ needsConfig: true }, { status: 200 })
    }
    console.error('[POST /api/memory/register]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
