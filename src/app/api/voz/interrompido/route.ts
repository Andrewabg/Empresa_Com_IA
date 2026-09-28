
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { truncarMensagemOuvida } from '@/data/messages'

export async function POST(request: Request) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  let body: { messageId?: unknown; textoOuvido?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const messageId = typeof body.messageId === 'string' ? body.messageId : ''
  const texto = typeof body.textoOuvido === 'string' ? body.textoOuvido : ''
  if (!messageId) return Response.json({ error: 'messageId é obrigatório' }, { status: 400 })

  try {
    
    
    
    return Response.json({ ok: await truncarMensagemOuvida(messageId, auth.id, texto) })
  } catch (err) {
    console.error('[POST /api/voz/interrompido]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
