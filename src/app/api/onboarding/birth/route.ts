import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { birthCompany, nascerPreEmpresa } from '@/server/onboarding/birth'
import { getCompanyProfile } from '@/data/settings'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  
  
  
  
  
  try {
    if ((await getCompanyProfile()).born) {
      return Response.json({ error: 'Esta empresa já nasceu.', reason: 'ja_nasceu' }, { status: 409 })
    }
  } catch (err) {
    console.warn('[POST /api/onboarding/birth] leitura de company_born falhou (portão fail-open):', err)
  }

  let body: { companyName?: unknown; operatorName?: unknown; mission?: unknown; voiceTone?: unknown; preEmpresa?: unknown }
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : ''
  const operatorName = typeof body.operatorName === 'string' ? body.operatorName.trim() : ''
  try {
    const preEmpresa = body.preEmpresa === true
    if (preEmpresa) {
      if (!operatorName) return Response.json({ error: 'operatorName é obrigatório' }, { status: 400 })
      const result = await nascerPreEmpresa({ operatorName, operatorId: auth.id })
      return Response.json(result)
    }
    if (!companyName || !operatorName) {
      return Response.json({ error: 'companyName e operatorName são obrigatórios' }, { status: 400 })
    }
    const result = await birthCompany({
      companyName, operatorName,
      mission: typeof body.mission === 'string' ? body.mission.trim() : '',
      voiceTone: typeof body.voiceTone === 'string' ? body.voiceTone.trim() : '',
    })
    return Response.json(result)
  } catch (err) {
    console.error('[POST /api/onboarding/birth]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
