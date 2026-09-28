import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { recordCost } from '@/data/cost'
import { costRealtimeUsd, type RealtimeUsage } from '@/server/cost/pricing'
import { getConversationForOperator } from '@/data/messages'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  let body: { usage?: unknown; model?: unknown; conversationId?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const usage = (typeof body.usage === 'object' && body.usage !== null ? body.usage : {}) as RealtimeUsage
  const model = typeof body.model === 'string' ? body.model : 'gpt-realtime'

  
  
  let agent = 'jarvis'
  const conversationId = typeof body.conversationId === 'string' ? body.conversationId : ''
  if (conversationId) {
    const conv = await getConversationForOperator(conversationId, auth.id).catch(() => null)
    if (conv?.agent_id) agent = conv.agent_id
  }

  try {
    await recordCost({
      kind: 'realtime',
      model,
      promptTokens: usage.input_tokens ?? 0,
      completionTokens: usage.output_tokens ?? 0,
      
      
      cachedTokens: usage.input_token_details?.cached_tokens ?? 0,
      agent,
      amountUsdOverride: costRealtimeUsd(usage),
    })
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/voice/cost]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
