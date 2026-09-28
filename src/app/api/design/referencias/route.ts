
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { roomConversation, getConversationForOperator } from '@/data/messages'
import { createArtifact } from '@/data/artifacts'
import { serverDb } from '@/server/supabase'


import { validarImagem, COPY_UPLOAD } from '@/lib/design/uploadDeImagem'
import { propostaDeConversaServe } from '@/lib/design/propostaDeConversa'

export async function POST(request: Request) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  let file: File
  let propostaConversa: string | undefined
  try {
    const form = await request.formData()
    const f = form.get('file')
    if (!(f instanceof File)) return NextResponse.json({ error: COPY_UPLOAD.semArquivo }, { status: 400 })
    file = f
    const c = form.get('conversationId')
    if (typeof c === 'string' && c.trim()) propostaConversa = c.trim()
  } catch {
    return NextResponse.json({ error: COPY_UPLOAD.formInvalido }, { status: 400 })
  }

  const v = validarImagem(file)
  if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 })
  const ext = v.ext

  try {
    const bytes = Buffer.from(await file.arrayBuffer())
    const room = await resolverConversa(auth.id, propostaConversa)
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
    const path = `referencias/${room.id}/${hash}.${ext}`
    const { error } = await serverDb().storage.from('artifacts').upload(path, bytes, { contentType: file.type, upsert: true })
    if (error) throw new Error(error.message)
    const artifact = await createArtifact({
      conversation_id: room.id, agent_id: 'operador', kind: 'imagem',
      title: `Referência: ${file.name}`.slice(0, 80), storage_ref: path,
    })
    return NextResponse.json({ ok: true, referencia: { id: artifact.id, titulo: artifact.title } })
  } catch (err) {
    console.error('[POST /api/design/referencias]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


async function resolverConversa(operatorId: string, proposta: string | undefined) {
  if (proposta) {
    const propria = await getConversationForOperator(proposta, operatorId)
    if (propria && propostaDeConversaServe(propria, 'designer')) return propria
  }
  return roomConversation(operatorId, 'designer')
}
