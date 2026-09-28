
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { enviarComoOperador, defaultInboxDeps, type AnexoOperador } from '@/server/canais/inboxActions'
import { serverDb } from '@/server/supabase'
import { BUCKET_MIDIA } from '@/server/canais/media'
import { tipoSaidaDoMime } from '@/lib/canais/midiaSaida'


async function carregarAnexo(conversaId: string, storagePath: string): Promise<AnexoOperador | null> {
  if (!storagePath.startsWith(`${conversaId}/out/`)) return null
  try {
    const { data, error } = await serverDb().storage.from(BUCKET_MIDIA).download(storagePath)
    if (error || !data) return null
    const bytes = new Uint8Array(await data.arrayBuffer())
    const mime = data.type || 'application/octet-stream'
    
    
    const tipo = tipoSaidaDoMime(mime, bytes.length)
    const kind: AnexoOperador['kind'] = tipo === 'imagem' ? 'image' : tipo === 'audio' ? 'audio' : 'document'
    return { kind, mime, nome: storagePath.split('/').pop() ?? 'arquivo', bytes, storagePath }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  
  let conversaId = ''
  let texto = ''
  let storagePath = ''
  try {
    const body = (await request.json().catch(() => ({}))) as {
      conversaId?: unknown; texto?: unknown; storagePath?: unknown
    }
    if (typeof body.conversaId === 'string') conversaId = body.conversaId.trim()
    if (typeof body.texto === 'string') texto = body.texto
    if (typeof body.storagePath === 'string') storagePath = body.storagePath.trim()
  } catch {
    
  }
  
  if (!conversaId || (!texto.trim() && !storagePath)) {
    return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })
  }

  try {
    const d = await defaultInboxDeps()
    const anexo = storagePath ? await carregarAnexo(conversaId, storagePath) : null
    if (storagePath && !anexo) return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })
    const res = await enviarComoOperador({ conversaId, texto, ...(anexo ? { anexo } : {}) }, d)
    return NextResponse.json(res)
  } catch (err) {
    console.error('[POST /api/inbox/enviar]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
