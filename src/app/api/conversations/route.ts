
import { cookies } from 'next/headers'
import { requireOperator } from '@/server/auth/session'
import { listRoomThreads, searchThreads } from '@/data/messages'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  let operator
  try {
    operator = await requireOperator(cookieStore)
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(request.url)
  const agentId = url.searchParams.get('agent') || 'jarvis'
  const q = (url.searchParams.get('q') || '').trim()
  const since = url.searchParams.get('since') || undefined
  const until = url.searchParams.get('until') || undefined

  try {
    if (!q) {
      const threads = await listRoomThreads(operator.id, agentId)
      return Response.json({ threads })
    }
    const threads = await searchThreads(operator.id, agentId, q, { since, until })
    return Response.json({ threads })
  } catch (e) {
    console.error('[GET /api/conversations]', e)
    
    return Response.json({ threads: [] })
  }
}
