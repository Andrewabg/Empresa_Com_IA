
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { proporLancarCriativo } from '@/server/tools/trafego/proporLancarCriativo'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth
  try {
    const body = (await request.json()) as { artifactId?: string; adsetId?: string; link?: string }
    const artifactId = body.artifactId?.trim()
    const adsetId = body.adsetId?.trim()
    if (!artifactId) return NextResponse.json({ error: 'artifactId obrigatório' }, { status: 400 })
    if (!adsetId) return NextResponse.json({ error: 'adsetId obrigatório' }, { status: 400 })

    
    
    const res = await proporLancarCriativo(
      { adsetId, artifactId, message: '', link: body.link?.trim() ?? '' },
      { operatorId: auth.id, actingAgentId: 'gestor-trafego' },
    )
    return NextResponse.json({ ok: true, output: res.output })
  } catch (err) {
    console.error('[POST /api/design/lancar]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
