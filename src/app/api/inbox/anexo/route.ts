
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { serverDb } from '@/server/supabase'
import { BUCKET_MIDIA } from '@/server/canais/media'
import { validarMidiaSaida, tipoSaidaDoMime, CAP_DOC_SAIDA, ERRO_ARQUIVO_GRANDE, type TipoSaida } from '@/lib/canais/midiaSaida'
import { lerCorpoComTeto, pedidoComCorpo } from '@/server/http/corpoComTeto'
import { getConversa } from '@/data/conversasExternas'
import { chaveDeArquivoSegura } from '@/lib/storage/chaveSegura'


const TETO_DO_CORPO_DO_ANEXO = CAP_DOC_SAIDA + 64 * 1024


const KIND: Record<TipoSaida, 'image' | 'document' | 'audio'> = {
  imagem: 'image', documento: 'document', audio: 'audio', video: 'document',
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  try {
    
    
    
    
    const corpo = await lerCorpoComTeto(request, TETO_DO_CORPO_DO_ANEXO)
    if (corpo === null) {
      return NextResponse.json({ ok: false, reason: 'anexo_invalido' as const, detalhe: ERRO_ARQUIVO_GRANDE }, { status: 413 })
    }
    const form = await pedidoComCorpo(request, corpo.bytes).formData().catch(() => null)
    const conversaId = String(form?.get('conversaId') ?? '').trim()
    const file = form?.get('file')
    if (!conversaId || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })
    }
    
    const conversa = await getConversa(conversaId)
    if (!conversa) return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })

    const mime = file.type || 'application/octet-stream'
    const tipo = tipoSaidaDoMime(mime, file.size)
    const kind = KIND[tipo]
    
    const v = validarMidiaSaida({ tipo, mime, bytes: file.size })
    if (!v.ok) return NextResponse.json({ ok: false, reason: 'anexo_invalido' as const, detalhe: v.legenda })

    const bytes = new Uint8Array(await file.arrayBuffer())
    
    const seguro = chaveDeArquivoSegura(file.name || 'arquivo')
    const path = `${conversaId}/out/${Date.now()}-${seguro}`
    const { error } = await serverDb().storage.from(BUCKET_MIDIA)
      .upload(path, Buffer.from(bytes), { contentType: mime, upsert: false })
    if (error) {
      console.warn('[POST /api/inbox/anexo] upload falhou:', error.message)
      return NextResponse.json({ ok: false, reason: 'upload_falhou' as const })
    }
    
    
    
    const aviso = mime.startsWith('image/') && tipo === 'documento'
      ? 'vai como arquivo (o WhatsApp só mostra JPEG e PNG como imagem)'
      : undefined
    return NextResponse.json({ ok: true, storagePath: path, kind, mime, nome: file.name || seguro, ...(aviso ? { aviso } : {}) })
  } catch (err) {
    console.error('[POST /api/inbox/anexo]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
