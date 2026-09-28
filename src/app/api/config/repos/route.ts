

import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { listWritableRepos } from '@/server/config/repos'

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

    
    return Response.json(await listWritableRepos(token))
  } catch (err) {
    console.error('[config/repos] error:', err)
    return Response.json({ error: 'Erro ao listar os repositórios.' }, { status: 500 })
  }
}
