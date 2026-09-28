
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { serverDb } from '@/server/supabase'
import { editCandidate, approveCandidate, rejectCandidate } from '@/data/importCandidates'
import { formatCandidate } from '@/lib/imports/candidateText'
import { runImportHeartbeat } from '@/server/imports/heartbeat'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; cid: string }> },
) {
  
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  const { id, cid: cidStr } = await params

  
  const cid = Number(cidStr)
  if (!Number.isSafeInteger(cid)) {
    return Response.json({ error: 'Parâmetro cid inválido.' }, { status: 400 })
  }

  
  let body: { titulo?: unknown; corpo?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Corpo da requisição inválido (esperado JSON).' }, { status: 400 })
  }

  const titulo = typeof body.titulo === 'string' ? body.titulo : null
  const corpo = typeof body.corpo === 'string' ? body.corpo : null
  if (titulo === null || corpo === null) {
    return Response.json({ error: 'Campos titulo e corpo são obrigatórios.' }, { status: 400 })
  }

  
  const db = serverDb()
  const rawContent = formatCandidate(titulo, corpo)
  const edited = await editCandidate(db, id, cid, rawContent)

  if (!edited) {
    
    return Response.json({ ok: false, error: 'Candidato não editável (já aprovado, descartado ou não encontrado).' }, { status: 409 })
  }

  return Response.json({ ok: true })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; cid: string }> },
) {
  
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  const { id, cid: cidStr } = await params

  
  const cid = Number(cidStr)
  if (!Number.isSafeInteger(cid)) {
    return Response.json({ error: 'Parâmetro cid inválido.' }, { status: 400 })
  }

  
  let body: { action?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Corpo da requisição inválido (esperado JSON).' }, { status: 400 })
  }

  const action = body.action
  if (action !== 'approve' && action !== 'reject') {
    return Response.json({ error: 'Ação inválida. Use "approve" ou "reject".' }, { status: 400 })
  }

  
  const db = serverDb()

  if (action === 'approve') {
    await approveCandidate(db, id, cid)
    
    
    void runImportHeartbeat().catch(err =>
      console.warn('[POST /api/cerebro/import/[id]/candidates/[cid]] kick heartbeat:', err),
    )
  } else {
    await rejectCandidate(db, id, cid)
  }

  return Response.json({ ok: true })
}
