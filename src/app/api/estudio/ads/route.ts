
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { listAdsDaConta } from '@/server/tools/estudio/perfDaPeca'

export async function GET() {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    const ads = await listAdsDaConta({ operatorId: auth.id })
    return NextResponse.json({ ads })
  } catch (err) {
    console.error('[GET /api/estudio/ads]', err)
    return NextResponse.json({ ads: [] })
  }
}
