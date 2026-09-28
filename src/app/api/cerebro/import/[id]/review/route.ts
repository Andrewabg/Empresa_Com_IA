
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { serverDb } from '@/server/supabase'
import { approveAll, rejectAll, approveSelected, rejectSelected } from '@/data/importCandidates'
import { runImportHeartbeat } from '@/server/imports/heartbeat'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  const { id } = await params

  
  let body: { action?: unknown; ids?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Corpo da requisição inválido (esperado JSON).' }, { status: 400 })
  }

  
  const action = body.action
  const acoesValidas = ['approve_all', 'reject_all', 'approve_selected', 'reject_selected']
  if (typeof action !== 'string' || !acoesValidas.includes(action)) {
    return Response.json(
      { error: 'Ação inválida. Use approve_all, reject_all, approve_selected ou reject_selected.' },
      { status: 400 },
    )
  }

  
  const db = serverDb()
  let count: number
  let kick = false

  if (action === 'approve_all') {
    count = await approveAll(db, id)
    kick = true
  } else if (action === 'reject_all') {
    count = await rejectAll(db, id)
  } else {
    
    const raw = (body as { ids?: unknown }).ids
    if (!Array.isArray(raw) || raw.some((x) => !Number.isSafeInteger(x))) {
      return Response.json({ error: 'ids inválido (esperado lista de inteiros).' }, { status: 400 })
    }
    const ids = Array.from(new Set(raw as number[])).slice(0, 1000)
    if (ids.length === 0) return Response.json({ ok: true, count: 0 })
    if (action === 'approve_selected') {
      count = await approveSelected(db, id, ids)
      kick = true
    } else {
      count = await rejectSelected(db, id, ids)
    }
  }

  
  
  if (kick) {
    void runImportHeartbeat().catch((err) =>
      console.warn('[POST /api/cerebro/import/[id]/review] kick heartbeat:', err),
    )
  }
  return Response.json({ ok: true, count })
}
