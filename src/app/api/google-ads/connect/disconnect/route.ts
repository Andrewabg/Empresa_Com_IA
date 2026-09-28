
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getSecret } from '@/server/secrets'
import { setSetting } from '@/data/settings'
import { hubDisconnect } from '@/server/google-ads/hub-connect'

export const dynamic = 'force-dynamic'

export async function POST() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  
  
  const licenseKey = await getSecret('license_key')
  if (licenseKey) {
    await hubDisconnect(licenseKey)
  }

  
  await setSetting('google_ads_conectado', 'false')
  await setSetting('google_ads_customer_id', '')
  return Response.json({ ok: true })
}
