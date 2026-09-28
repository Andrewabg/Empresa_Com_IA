

import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { setSecret, getSecret } from '@/server/secrets'
import { validateLicense } from '@/server/hub/client'
import { fetchCatalog } from '@/server/hub/catalog'
import { readLicenseCache } from '@/server/license/cache'
import { getLicenseState } from '@/lib/license-state'


const LICENSE_KEY_SECRET = 'license_key'


async function stateResponse() {
  const cache = await readLicenseCache()
  const state = getLicenseState(cache, Date.now())
  return Response.json({
    state,
    ...(cache?.buyer_name !== undefined ? { buyer_name: cache.buyer_name } : {}),
    ...(cache?.club_incluso_ate !== undefined ? { club_incluso_ate: cache.club_incluso_ate } : {}),
    
    
    
    ...(cache?.firehose_reason !== undefined ? { firehose_reason: cache.firehose_reason } : {}),
  })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const raw = body.license_key
  const licenseKey = typeof raw === 'string' ? raw.trim() : ''

  
  
  
  if (!licenseKey && body.revalidate === true) {
    const stored = await getSecret(LICENSE_KEY_SECRET)
    if (!stored) {
      return Response.json({ error: 'Cole sua chave de licença.' }, { status: 400 })
    }
    try {
      await validateLicense(stored)
      try {
        await fetchCatalog()
      } catch (e) {
        console.warn('[api/license POST revalidate] refresh do catálogo fail-open:', e)
      }
      return await stateResponse()
    } catch (err) {
      console.error('[api/license POST revalidate] error:', err)
      return Response.json({ error: 'Erro ao validar a licença.' }, { status: 500 })
    }
  }

  if (!licenseKey) {
    return Response.json({ error: 'Cole sua chave de licença.' }, { status: 400 })
  }

  try {
    
    
    await setSecret(LICENSE_KEY_SECRET, licenseKey)
    await validateLicense(licenseKey)
    
    
    
    
    try {
      await fetchCatalog()
    } catch (e) {
      console.warn('[api/license POST] refresh do catálogo fail-open:', e)
    }
    return await stateResponse()
  } catch (err) {
    console.error('[api/license POST] error:', err)
    return Response.json({ error: 'Erro ao ativar a licença.' }, { status: 500 })
  }
}

export async function GET() {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  try {
    return await stateResponse()
  } catch (err) {
    console.error('[api/license GET] error:', err)
    return Response.json({ error: 'Erro ao ler o estado da licença.' }, { status: 500 })
  }
}
