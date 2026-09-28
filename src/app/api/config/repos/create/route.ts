

import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { createBrainRepo } from '@/server/config/repos'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireDonoApi(cookieStore)
  if (auth instanceof Response) return auth

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }

  try {
    const typedToken =
      typeof body[SECRET_KEYS.github_token] === 'string' &&
      (body[SECRET_KEYS.github_token] as string).trim().length > 0
        ? (body[SECRET_KEYS.github_token] as string).trim()
        : null

    const token = typedToken ?? (await getSecret(SECRET_KEYS.github_token))
    if (!token) {
      return Response.json({ ok: false, detail: 'configure o token primeiro' })
    }

    
    return Response.json(await createBrainRepo(token, name))
  } catch (err) {
    console.error('[config/repos/create] error:', err)
    return Response.json({ error: 'Erro ao criar o repositório.' }, { status: 500 })
  }
}
