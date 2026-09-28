

import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { runConfigTest } from '@/server/config/validate'
import type { TestTarget } from '@/server/config/validate'

function parseTarget(raw: unknown): TestTarget | undefined {
  if (raw === 'openai' || raw === 'github' || raw === 'github_token' || raw === 'composio') {
    return raw
  }
  return undefined
}

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
    const target = parseTarget(body.target)
    const result = await runConfigTest(body, target, {
      getStoredSecret: getSecret,
      keys: SECRET_KEYS,
    })
    
    return Response.json(result)
  } catch (err) {
    console.error('[config/test] error:', err)
    return Response.json({ error: 'Erro ao testar a conexão.' }, { status: 500 })
  }
}
