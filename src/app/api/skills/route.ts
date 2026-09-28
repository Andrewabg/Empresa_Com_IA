import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { listSkillCatalog } from '@/server/agent/skills/catalog'


export async function GET(_request: Request) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  try {
    const skills = await listSkillCatalog()
    return NextResponse.json({ skills })
  } catch (err) {
    console.error('[GET /api/skills]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
