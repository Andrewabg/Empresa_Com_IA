
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { checkToolkitConnections } from '@/server/config/connections'

export async function GET() {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    return Response.json(await checkToolkitConnections())
  } catch (err) {
    console.warn('[config/connections] falhou (não-fatal):', err instanceof Error ? err.message : err)
    return Response.json({ configured: false, healthOk: false, toolkits: [], pendingRequired: [] })
  }
}
