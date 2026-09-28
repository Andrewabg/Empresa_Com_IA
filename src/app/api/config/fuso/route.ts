import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getSetting, setSetting } from '@/data/settings'
import { FUSO_SETTING_KEY, TZ_DEFAULT, ehFusoValido } from '@/lib/tempo/fusoDoDono'


export async function GET() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  const v = await getSetting(FUSO_SETTING_KEY)
  return NextResponse.json({ fuso: v ?? null, padrao: TZ_DEFAULT })
}

export async function PUT(req: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  const body = (await req.json().catch(() => null)) as { fuso?: unknown } | null
  const fuso = typeof body?.fuso === 'string' ? body.fuso.trim() : ''
  
  
  if (!ehFusoValido(fuso)) {
    return NextResponse.json({ error: 'Esse fuso não existe. Escolha um da lista.' }, { status: 400 })
  }
  await setSetting(FUSO_SETTING_KEY, fuso)
  return NextResponse.json({ ok: true, fuso })
}
