
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { readLicenseCache } from '@/server/license/cache'
import { getLicenseState, lojaLiberada } from '@/lib/license-state'
import { getSecret } from '@/server/secrets'
import { setSetting } from '@/data/settings'
import { hubSelect } from '@/server/google-ads/hub-connect'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  const state = getLicenseState(await readLicenseCache(), Date.now())
  if (!lojaLiberada(state)) {
    return Response.json(
      { error: { code: 'PREMIUM_REQUIRED', message: 'Google Ads requer licença/Club ativo.' } },
      { status: 403 },
    )
  }

  const licenseKey = await getSecret('license_key')
  if (!licenseKey) {
    return Response.json(
      { error: { code: 'SEM_LICENCA', message: 'Conecte sua licença primeiro.' } },
      { status: 409 },
    )
  }

  let body: { customer_id?: unknown; login_customer_id?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: { code: 'JSON_INVALIDO', message: 'JSON inválido.' } }, { status: 400 })
  }
  const customerId = typeof body.customer_id === 'string' ? body.customer_id.trim() : ''
  if (!customerId) {
    return Response.json(
      { error: { code: 'VALIDATION_FAILED', message: 'customer_id obrigatório.' } },
      { status: 400 },
    )
  }
  const loginCustomerId = typeof body.login_customer_id === 'string' && body.login_customer_id.trim()
    ? body.login_customer_id.trim()
    : undefined

  const r = await hubSelect(licenseKey, customerId, loginCustomerId)
  if (!r.ok) {
    
    const status = r.code === 'NETWORK' || r.code === 'BAD_RESPONSE' ? 502 : r.status
    return Response.json({ error: { code: r.code, message: 'Não consegui salvar a conta escolhida.' } }, { status })
  }

  
  await setSetting('google_ads_conectado', 'true')
  await setSetting('google_ads_customer_id', customerId)
  return Response.json({ ok: true, customer_id: customerId })
}
