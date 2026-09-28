
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { readLicenseCache } from '@/server/license/cache'
import { getLicenseState, lojaLiberada } from '@/lib/license-state'
import { getSecret } from '@/server/secrets'
import { baseUrlDaRequisicao } from '@/lib/public-url'
import { hubAuthUrl } from '@/server/google-ads/hub-connect'

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

  const returnUrl = `${baseUrlDaRequisicao(request)}/integracoes`
  const r = await hubAuthUrl(licenseKey, returnUrl)
  if (r.ok) return Response.json({ url: r.data.url })

  const status = r.code === 'NETWORK' || r.code === 'BAD_RESPONSE' ? 502 : r.status
  return Response.json({ error: { code: r.code, message: 'Não consegui iniciar a conexão com o Google.' } }, { status })
}
