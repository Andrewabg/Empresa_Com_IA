
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { listBase, deleteEntradaBase, setEntradaEnabled } from '@/data/baseConhecimento'
import { salvarEntradaBase } from '@/server/canais/baseActions'
import { parseBulkAction } from '@/lib/inbox/rascunhos'

export async function GET() {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  try {
    const entradas = await listBase()
    return NextResponse.json({ ok: true, entradas })
  } catch (err) {
    console.error('[GET /api/inbox/base]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  
  const body = (await request.json().catch(() => null)) as {
    id?: unknown; titulo?: unknown; conteudo?: unknown; agent_id?: unknown; enabled?: unknown
    action?: unknown; ids?: unknown
  } | null

  
  
  const bulk = parseBulkAction(body)
  if (bulk) {
    try {
      for (const id of bulk.ids) {
        if (bulk.action === 'enable_all') await setEntradaEnabled(id, true)
        else await deleteEntradaBase(id)
      }
      return NextResponse.json({ ok: true, count: bulk.ids.length })
    } catch (err) {
      console.error('[POST /api/inbox/base] bulk', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  
  let id: string | undefined
  let titulo = ''
  let conteudo = ''
  let agent_id: string | null = null
  let enabled: boolean | undefined
  let toggleDireto = false 

  try {
    if (typeof body?.id === 'string' && body.id.trim()) id = body.id.trim()
    if (typeof body?.titulo === 'string') titulo = body.titulo
    if (typeof body?.conteudo === 'string') conteudo = body.conteudo
    if (typeof body?.agent_id === 'string') agent_id = body.agent_id.trim() || null
    else if (body?.agent_id === null) agent_id = null
    if (typeof body?.enabled === 'boolean') enabled = body.enabled
    toggleDireto =
      id !== undefined &&
      typeof body?.enabled === 'boolean' &&
      body?.titulo === undefined &&
      body?.conteudo === undefined
  } catch {
    
  }

  try {
    
    if (toggleDireto && id !== undefined && enabled !== undefined) {
      await setEntradaEnabled(id, enabled)
      return NextResponse.json({ ok: true, id })
    }
    const res = await salvarEntradaBase({ id, titulo, conteudo, agent_id, enabled })
    if (!res.ok) return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })
    return NextResponse.json({ ok: true, id: res.id })
  } catch (err) {
    console.error('[POST /api/inbox/base]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  const url = new URL(request.url)
  const id = url.searchParams.get('id')?.trim() ?? ''
  if (!id) return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })

  try {
    await deleteEntradaBase(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/inbox/base]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
