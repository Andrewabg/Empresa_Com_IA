
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getDefaultBrand } from '@/data/brands'
import { getBrandVoice, upsertBrandVoice } from '@/data/brandVoice'
import { removerAprendizado, EMPTY_BRAND_VOICE } from '@/lib/estudio/brandVoice'
import { espelharVozNoCerebro } from '@/server/tools/estudio/espelhoCerebro'

export async function GET() {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  try {
    const brand = await getDefaultBrand(auth.id)
    if (!brand) return NextResponse.json({ ok: true, voice: EMPTY_BRAND_VOICE })
    const voice = await getBrandVoice(auth.id, brand.id)
    return NextResponse.json({ ok: true, voice })
  } catch (err) {
    console.error('[GET /api/estudio/marca]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  let body: { action?: unknown; texto?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  
  if (body.action !== 'remover_aprendizado') {
    return NextResponse.json({ error: "action deve ser 'remover_aprendizado'" }, { status: 400 })
  }
  const texto = body.texto
  if (typeof texto !== 'string' || !texto.trim()) {
    return NextResponse.json({ error: 'texto é obrigatório' }, { status: 400 })
  }

  try {
    const brand = await getDefaultBrand(auth.id)
    
    if (!brand) return NextResponse.json({ ok: false })

    const atual = await getBrandVoice(auth.id, brand.id)
    const voice = removerAprendizado(atual, texto)
    await upsertBrandVoice(auth.id, brand.id, voice)

    
    try {
      await espelharVozNoCerebro({ slug: brand.slug, nomeMarca: brand.nome, voice })
    } catch (e) {
      console.warn('[PATCH /api/estudio/marca] espelho no Cérebro falhou (não-fatal):', e)
    }

    return NextResponse.json({ ok: true, voice })
  } catch (err) {
    console.error('[PATCH /api/estudio/marca]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
