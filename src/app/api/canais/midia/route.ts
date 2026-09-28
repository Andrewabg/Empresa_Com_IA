
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { serverDb } from '@/server/supabase'
import { BUCKET_MIDIA } from '@/server/canais/media'
import { getCanal } from '@/data/canais'
import { chaveDeArquivoSegura } from '@/lib/storage/chaveSegura'
import {
  listCanalMidia, upsertCanalMidia, setCanalMidiaEnabled, deleteCanalMidia, getCanalMidiaBySlug,
} from '@/data/canalMidia'
import { normalizarSlug } from '@/lib/canais/midiaPublica'
import { validarMidiaSaida, tipoSaidaDoMime } from '@/lib/canais/midiaSaida'

export async function GET(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  const canalId = new URL(request.url).searchParams.get('canal')?.trim() ?? ''
  if (!canalId) return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })
  try {
    const arquivos = await listCanalMidia(canalId)
    return NextResponse.json({ ok: true, arquivos })
  } catch (err) {
    console.error('[GET /api/canais/midia]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    const form = await request.formData().catch(() => null)
    const canalId = String(form?.get('canalId') ?? '').trim()
    const rotuloBruto = String(form?.get('rotulo') ?? '').trim()
    const descricao = String(form?.get('descricao') ?? '').trim().slice(0, 300)
    const file = form?.get('file')
    if (!canalId || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })
    }
    if (!(await getCanal(canalId))) {
      return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })
    }

    const rotulo = (rotuloBruto || file.name || 'Arquivo').slice(0, 80)
    const mime = file.type || 'application/octet-stream'
    const tipo = tipoSaidaDoMime(mime, file.size)
    
    
    const v = validarMidiaSaida({ tipo, mime, bytes: file.size })
    if (!v.ok) return NextResponse.json({ ok: false, reason: 'arquivo_invalido' as const, detalhe: v.legenda })

    
    
    const raiz = normalizarSlug(rotulo) || 'arquivo'
    let slug = raiz
    for (let i = 2; i <= 50 && (await getCanalMidiaBySlug(canalId, slug)); i++) slug = `${raiz}-${i}`

    const seguro = chaveDeArquivoSegura(file.name || 'arquivo')
    const path = `canal/${canalId}/publico/${Date.now()}-${seguro}`
    const bytes = new Uint8Array(await file.arrayBuffer())
    const { error } = await serverDb().storage.from(BUCKET_MIDIA)
      .upload(path, Buffer.from(bytes), { contentType: mime, upsert: false })
    if (error) {
      console.warn('[POST /api/canais/midia] upload falhou:', error.message)
      return NextResponse.json({ ok: false, reason: 'upload_falhou' as const })
    }

    const row = await upsertCanalMidia({
      canal_id: canalId, slug, rotulo, descricao,
      storage_bucket: BUCKET_MIDIA, storage_path: path, mime, bytes: file.size, enabled: true,
    })
    
    
    const aviso = mime.startsWith('image/') && tipo === 'documento'
      ? 'vai como arquivo (o WhatsApp só mostra JPEG e PNG como imagem)'
      : undefined
    return NextResponse.json({ ok: true, arquivo: row, ...(aviso ? { aviso } : {}) })
  } catch (err) {
    console.error('[POST /api/canais/midia]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  
  let id = ''
  let enabled: boolean | null = null
  try {
    const body = (await request.json().catch(() => ({}))) as { id?: unknown; enabled?: unknown }
    if (typeof body.id === 'string') id = body.id.trim()
    if (typeof body.enabled === 'boolean') enabled = body.enabled
  } catch {  }
  if (!id || enabled === null) return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })
  try {
    await setCanalMidiaEnabled(id, enabled)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/canais/midia]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  let id = ''
  try {
    const body = (await request.json().catch(() => ({}))) as { id?: unknown }
    if (typeof body.id === 'string') id = body.id.trim()
  } catch {  }
  if (!id) return NextResponse.json({ ok: false, reason: 'bad_request' as const }, { status: 400 })
  try {
    const alvo = await deleteCanalMidia(id)
    
    
    if (alvo) {
      const { error } = await serverDb().storage.from(alvo.storage_bucket || BUCKET_MIDIA).remove([alvo.storage_path])
      if (error) console.warn('[DELETE /api/canais/midia] objeto não removido:', error.message)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/canais/midia]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
