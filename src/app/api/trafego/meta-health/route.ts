
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { checkMetaReadHealth, invalidateMetaHealthCache } from '@/server/config/metaHealth'

export async function GET(request: Request) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  
  
  
  if (new URL(request.url).searchParams.get('fresh') === '1') invalidateMetaHealthCache()
  return Response.json({ status: await checkMetaReadHealth() })
}
