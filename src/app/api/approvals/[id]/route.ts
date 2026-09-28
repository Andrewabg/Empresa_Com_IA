
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getApproval, updateApprovalArgs } from '@/data/approvals'
import { patchLaunchArgs, type LaunchFields } from './patchLaunchArgs'

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  
  const auth = await requireDonoApi(cookieStore)
  if (auth instanceof Response) return auth

  try {
    const { id } = await ctx.params

    let body: { fields?: unknown }
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const raw = (body.fields ?? {}) as Record<string, unknown>
    const fields: LaunchFields = {}
    if (typeof raw.message === 'string') fields.message = raw.message
    if (typeof raw.headline === 'string') fields.headline = raw.headline
    if (typeof raw.cta === 'string') fields.cta = raw.cta
    if (typeof raw.link === 'string') fields.link = raw.link

    const r = await patchLaunchArgs(id, fields, { getApproval, updateApprovalArgs })
    return Response.json(r.body, { status: r.status })
  } catch (err) {
    
    console.error('[PATCH /api/approvals/:id]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
