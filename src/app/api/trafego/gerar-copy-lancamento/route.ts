
import { cookies } from 'next/headers'
import { requireOperator } from '@/server/auth/session'
import { gerarCopyLancamentoHandler } from './handler'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  let operatorId: string
  try {
    operatorId = (await requireOperator(cookieStore)).id
  } catch (err) {
    const isRedirect =
      typeof (err as { digest?: unknown })?.digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    if (isRedirect) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    throw err
  }
  try {
    const body = await request.json().catch(() => ({}))
    const r = await gerarCopyLancamentoHandler(body, operatorId)
    return Response.json(r.body, { status: r.status })
  } catch (err) {
    console.error('[POST /api/trafego/gerar-copy-lancamento]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
