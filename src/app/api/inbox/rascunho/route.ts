
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getMensagem } from '@/data/mensagensExternas'
import { aprovarRascunhoAction, descartarRascunhoAction, defaultInboxDeps } from '@/server/canais/inboxActions'

const ACOES = ['aprovar', 'descartar'] as const
type Acao = typeof ACOES[number]

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  
  let mensagemId = ''
  let acao: Acao | '' = ''
  let texto: string | undefined
  try {
    const body = (await request.json().catch(() => ({}))) as { mensagemId?: unknown; acao?: unknown; texto?: unknown }
    if (typeof body.mensagemId === 'string') mensagemId = body.mensagemId.trim()
    if (typeof body.acao === 'string' && (ACOES as readonly string[]).includes(body.acao)) acao = body.acao as Acao
    if (typeof body.texto === 'string') texto = body.texto
  } catch {
    
  }
  if (!mensagemId || !acao) return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })

  try {
    const d = await defaultInboxDeps()
    if (acao === 'descartar') {
      const res = await descartarRascunhoAction({ mensagemId }, d)
      return NextResponse.json(res)
    }
    
    const textoFinal = typeof texto === 'string' ? texto : ((await getMensagem(mensagemId))?.texto ?? '')
    const res = await aprovarRascunhoAction({ mensagemId, texto: textoFinal }, d)
    return NextResponse.json(res)
  } catch (err) {
    console.error('[POST /api/inbox/rascunho]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
