import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getArtifact } from '@/data/artifacts'
import { getConversationForOperator } from '@/data/messages'
import { isAnexoDeConversa } from '@/lib/artifacts'
import { serverDb } from '@/server/supabase'


export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  const { id } = await ctx.params

  let storageRef: string | null
  try {
    const artifact = await getArtifact(id)
    if (!artifact) return NextResponse.json({ error: 'Artefato não encontrado' }, { status: 404 })
    
    
    
    if (isAnexoDeConversa(artifact)) {
      const conversaDoOperador = artifact.conversation_id
        ? await getConversationForOperator(artifact.conversation_id, auth.id)
        : null
      if (!conversaDoOperador) {
        return NextResponse.json({ error: 'Artefato não encontrado' }, { status: 404 })
      }
    }
    storageRef = artifact.storage_ref
  } catch (err) {
    console.error('[GET /api/artifacts/:id/url]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  if (!storageRef) {
    return NextResponse.json({ error: 'Artefato sem imagem (storage_ref vazio)' }, { status: 400 })
  }

  
  
  const { data, error } = await serverDb().storage.from('artifacts').createSignedUrl(storageRef, 3600)
  if (error || !data?.signedUrl) {
    console.error('[GET /api/artifacts/:id/url] createSignedUrl:', error)
    return NextResponse.json({ error: 'Falha ao assinar a URL da imagem' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
