
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getCompanyProfile } from '@/data/settings'
import { estabelecerIdentidadeEmpresa } from '@/server/onboarding/estabelecerIdentidade'


const NOME_MAX = 80
const MISSAO_MAX = 400

export async function GET() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    const p = await getCompanyProfile()
    return Response.json({ ok: true, companyName: p.companyName ?? '', mission: p.mission ?? '' })
  } catch (err) {
    console.error('[GET /api/config/identidade]', err)
    return Response.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : ''
  const missionRaw = typeof body.mission === 'string' ? body.mission.trim() : ''
  if (!companyName) {
    return Response.json({ ok: false, error: 'O nome da empresa não pode ficar em branco.' }, { status: 400 })
  }
  if (companyName.length > NOME_MAX || missionRaw.length > MISSAO_MAX) {
    return Response.json({ ok: false, error: 'Texto longo demais.' }, { status: 400 })
  }

  try {
    await estabelecerIdentidadeEmpresa({ companyName, mission: missionRaw || undefined })
    return Response.json({ ok: true, companyName, mission: missionRaw })
  } catch (err) {
    console.error('[POST /api/config/identidade]', err)
    return Response.json({ ok: false, error: 'Não foi possível salvar.' }, { status: 500 })
  }
}
