import { cookies } from 'next/headers'
import { requireOperator } from '@/server/auth/session'
import { renameConversation } from '@/data/messages'

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  let operator
  try {
    operator = await requireOperator(cookieStore)
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params
  let body: { title?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return Response.json({ error: 'title is required' }, { status: 400 })
  try {
    await renameConversation(id, operator.id, title.slice(0, 120))
    return Response.json({ ok: true })
  } catch (e) {
    console.error('[PATCH /api/conversations/[id]]', e)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
