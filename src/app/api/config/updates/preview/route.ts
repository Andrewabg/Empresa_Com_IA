

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { detectDivergence } from '@/server/updates/detect'

export async function POST() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  const report = await detectDivergence() 
  return NextResponse.json(report)
}
