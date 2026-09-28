
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { lerEstadoReindex, pedirReindex } from '@/server/brain/reindex'

export async function GET() {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  return Response.json(await lerEstadoReindex())
}

export async function POST() {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    return Response.json(await pedirReindex())
  } catch (err) {
    console.error('[POST /api/cerebro/reindex]', err)
    return Response.json({ error: 'Não consegui registrar o pedido.' }, { status: 500 })
  }
}
