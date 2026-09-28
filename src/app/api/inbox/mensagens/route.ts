
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { listMensagensConversa, type MensagemExternaRow } from '@/data/mensagensExternas'
import { getConversa, zerarNaoLidas } from '@/data/conversasExternas'
import { getContato, type ContatoRow } from '@/data/contatos'
import { serverDb } from '@/server/supabase'
import { urlAssinadaDeMidia } from '@/server/canais/urlAssinadaMidia'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  const { searchParams } = new URL(request.url)
  const conversaId = (searchParams.get('conversa') ?? '').trim()
  if (!conversaId) return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })

  try {
    const [mensagens, conversa] = await Promise.all([
      listMensagensConversa(conversaId, 100),
      getConversa(conversaId),
      zerarNaoLidas(conversaId).catch(() => {}), 
    ])

    
    let contato: ContatoRow | null = null
    if (conversa) {
      try {
        contato = await getContato(conversa.contato_id)
      } catch {
        contato = null
      }
    }

    
    
    
    const db = serverDb()
    const comUrls = await Promise.all(
      mensagens.map(async (msg: MensagemExternaRow) => {
        const storagePath = msg.midia?.storage_path
        if (!storagePath) return msg
        const midiaUrl = await urlAssinadaDeMidia(db, storagePath)
        return midiaUrl ? { ...msg, midiaUrl } : msg
      }),
    )

    return NextResponse.json({ ok: true, mensagens: comUrls, contato })
  } catch (err) {
    console.error('[GET /api/inbox/mensagens]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
