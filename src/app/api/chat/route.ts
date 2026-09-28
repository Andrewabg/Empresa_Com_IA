
import { cookies } from 'next/headers'
import { handleChat } from '@/server/agent/chat'
import { COPY_RECUSA, MAX_ANEXOS } from '@/lib/conversa/anexo'


function lerAnexoIds(bruto: unknown): string[] | null {
  if (bruto === undefined || bruto === null) return []
  if (!Array.isArray(bruto)) return null
  const ids: string[] = []
  for (const item of bruto) {
    if (typeof item !== 'string') return null
    const id = item.trim()
    if (!id) return null
    if (!ids.includes(id)) ids.push(id)
  }
  return ids
}

export async function POST(request: Request) {
  let body: { conversationId?: unknown; userText?: unknown; kickoff?: unknown; fresh?: unknown; agentId?: unknown; handoff?: unknown; focoContratoId?: unknown; anexoIds?: unknown; porVoz?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  
  const kickoff = body && (body as { kickoff?: unknown }).kickoff === true
  const fresh = body && (body as { fresh?: unknown }).fresh === true
  const userText = typeof body.userText === 'string' ? body.userText.trim() : ''
  const anexoIds = lerAnexoIds(body.anexoIds)
  if (anexoIds === null) {
    return Response.json({ error: 'anexoIds inválido' }, { status: 400 })
  }
  if (anexoIds.length > MAX_ANEXOS) {
    return Response.json({ error: COPY_RECUSA.quantidade }, { status: 400 })
  }
  
  if (!kickoff && !userText && anexoIds.length === 0) {
    return Response.json({ error: 'userText is required' }, { status: 400 })
  }
  const conversationId =
    typeof body.conversationId === 'string' && body.conversationId.length > 0
      ? body.conversationId
      : undefined
  const agentId = typeof body.agentId === 'string' ? body.agentId : undefined
  const handoff = typeof body.handoff === 'string' ? body.handoff : undefined
  const focoContratoId = typeof body.focoContratoId === 'string' && body.focoContratoId.length > 0 ? body.focoContratoId : undefined
  
  const porVoz = body.porVoz === true

  const cookieStore = await cookies()

  try {
    return await handleChat({
      conversationId,
      userText: userText || undefined,
      cookies: cookieStore,
      kickoff,
      fresh,
      agentId,
      handoff,
      focoContratoId,
      anexoIds,
      porVoz,
    })
  } catch (err) {
    
    
    
    const isRedirect =
      typeof (err as { digest?: unknown })?.digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    if (isRedirect) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[POST /api/chat]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
