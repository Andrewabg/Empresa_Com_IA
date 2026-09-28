
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getBrain, NotConfiguredError } from '@/server/brain/runtime'
import { undoImport } from '@/server/imports/undo'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  const { id } = await params

  
  let brain: Awaited<ReturnType<typeof getBrain>>
  try {
    brain = await getBrain()
  } catch (e) {
    if (e instanceof NotConfiguredError) {
      return Response.json({ error: 'Cérebro não configurado.' }, { status: 409 })
    }
    console.error('[POST /api/cerebro/import/[id]/undo] getBrain:', e)
    return Response.json({ error: 'Erro ao acessar o Cérebro.' }, { status: 500 })
  }

  
  const res = await undoImport(brain, id)
  if (res.ok) {
    return Response.json({ ok: true, reverted: res.reverted })
  }

  const status =
    res.reason === 'not_found' ? 404 : res.reason === 'conflict' ? 409 : 422
  return Response.json({ ok: false, reason: res.reason, error: res.message }, { status })
}
