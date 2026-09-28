import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getSetting, setSetting } from '@/data/settings'


export async function GET() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  const v = await getSetting('ui_technical_mode')
  return NextResponse.json({ technical_mode: v === '1' })
}

export async function PUT(req: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  const body = (await req.json().catch(() => null)) as { technical_mode?: unknown } | null
  if (!body || typeof body.technical_mode !== 'boolean') {
    return NextResponse.json({ error: 'technical_mode deve ser boolean' }, { status: 400 })
  }
  await setSetting('ui_technical_mode', body.technical_mode ? '1' : '0')
  return NextResponse.json({ ok: true, technical_mode: body.technical_mode })
}
