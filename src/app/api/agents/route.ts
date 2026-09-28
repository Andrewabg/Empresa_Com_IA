import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperator } from '@/server/auth/session'
import { listAgents } from '@/data/agents'

export async function GET() {
  try {
    await requireOperator(await cookies())
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json({ agents: await listAgents() })
  } catch (err) {
    console.error('[GET /api/agents]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
