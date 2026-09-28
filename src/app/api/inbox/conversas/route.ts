
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { listConversasInbox } from '@/data/conversasExternas'
import { lerFiltroStatus, statusDoFiltro, limiteAceito, termoDeBusca } from '@/lib/inbox/filtroConversas'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  const url = new URL(request.url)
  const desdeBruto = Number.parseInt(url.searchParams.get('desde') ?? '', 10)
  const canal = url.searchParams.get('canal')
  try {
    const pagina = await listConversasInbox({
      limite: limiteAceito(url.searchParams.get('limite')),
      desde: Number.isFinite(desdeBruto) && desdeBruto > 0 ? desdeBruto : 0,
      status: statusDoFiltro(lerFiltroStatus(url.searchParams.get('status'))),
      canalId: canal && canal !== 'todos' ? canal : null,
      busca: termoDeBusca(url.searchParams.get('busca')),
    })
    return NextResponse.json({ ok: true, ...pagina })
  } catch (e) {
    console.warn('[GET /api/inbox/conversas]', e)
    return NextResponse.json({ ok: false, reason: 'erro' as const }, { status: 500 })
  }
}
