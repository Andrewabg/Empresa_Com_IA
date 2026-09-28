
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { checkComposioHealth } from '@/server/config/health'

export async function GET() {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  try {
    const composio = await checkComposioHealth()
    return Response.json({ composio })
  } catch (err) {
    
    console.warn('[config/health] falhou (não-fatal):', err instanceof Error ? err.message : err)
    return Response.json({ composio: { configured: false } })
  }
}
