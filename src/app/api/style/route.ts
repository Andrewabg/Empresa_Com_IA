import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getStyleProfile, saveStyleProfile } from '@/data/operatorStyle'
import { validateStylePatch } from './validate'

export async function GET() {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    return Response.json({ style: await getStyleProfile(auth.id) })
  } catch (err) {
    console.error('[/api/style GET]', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  const body = await req.json().catch(() => null)
  const r = validateStylePatch(body)
  if (!r.ok) return Response.json({ error: r.error }, { status: 400 })
  try {
    const current = await getStyleProfile(auth.id)
    const lastChange = { source: 'manual' as const, resumo: 'ajuste manual no painel', at: new Date().toISOString() }
    const saved = {
      dials: r.patch.dials ?? current.dials,
      notas: r.patch.notas ?? current.notas,
      learningPaused: r.patch.learningPaused ?? current.learningPaused,
      lastChange,
      updatedAt: new Date().toISOString(),
    }
    await saveStyleProfile(auth.id, { dials: saved.dials, notas: saved.notas, learningPaused: saved.learningPaused, lastChange })
    return Response.json({ style: saved })
  } catch (err) {
    console.error('[/api/style PUT]', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
