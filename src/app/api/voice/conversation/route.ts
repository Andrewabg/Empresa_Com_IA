import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { roomConversation } from '@/data/messages'
import { getAgentRow } from '@/data/agents'


export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  let agentId = 'jarvis'
  try {
    const body = (await request.json()) as Record<string, unknown>
    if (typeof body.agentId === 'string' && body.agentId.length > 0) {
      agentId = body.agentId
    }
  } catch {
    
  }

  
  
  if (agentId !== 'jarvis') {
    const row = await getAgentRow(agentId).catch(() => null)
    if (!row || !row.enabled) agentId = 'jarvis'
  }

  try {
    const conv = await roomConversation(auth.id, agentId)
    return Response.json({ conversationId: conv.id })
  } catch (err) {
    console.error('[POST /api/voice/conversation]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
