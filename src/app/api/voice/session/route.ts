import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { mintRealtimeSession, REALTIME_VOICE } from '@/server/voice/session'
import { readBudgetGate } from '@/data/cost'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { getAgentRow } from '@/data/agents'
import { voiceForAgent, MSG_AGENTE_SEM_VOZ } from '@/lib/voicePalette'


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

  try {
    
    const row = await getAgentRow(agentId).catch(() => null)

    
    
    
    if (row?.voz_desligada) {
      return Response.json({ error: 'voz_desligada', mensagem: MSG_AGENTE_SEM_VOZ }, { status: 409 })
    }

    const isPrimary = !row || row.is_primary || agentId === 'jarvis'
    
    
    
    const voice = row?.voice ?? voiceForAgent(agentId, isPrimary, REALTIME_VOICE)

    const result = await mintRealtimeSession({
      
      
      
      getSummary: () => readBudgetGate(),
      getApiKey: () => getSecret(SECRET_KEYS.openai_api_key),
      fetchImpl: fetch,
    }, { voice })

    return Response.json(result)
  } catch (err) {
    console.error('[POST /api/voice/session]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
