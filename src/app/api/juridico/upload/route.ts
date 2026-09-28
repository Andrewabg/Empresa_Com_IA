
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { createContrato, setArquivoRef } from '@/data/contratos'
import { extrairTextoPdf } from '@/server/juridico/extrairPdf'
import { toContratoView } from '@/lib/juridico/types'
import { serverDb } from '@/server/supabase'

const MAX_BYTES = 10 * 1024 * 1024

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  try {
    const contentType = request.headers.get('content-type') ?? ''

    let texto: string
    let titulo: string
    let pdfBuf: ArrayBuffer | null = null

    if (contentType.includes('multipart/form-data')) {
      
      const form = await request.formData()
      const file = form.get('file')
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Envie um arquivo.' }, { status: 400 })
      }
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      if (!isPdf) {
        return NextResponse.json({ error: 'Só aceito PDF por aqui (ou cola o texto).' }, { status: 400 })
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'Arquivo grande demais (máx 10MB).' }, { status: 400 })
      }

      const buf = await file.arrayBuffer()
      let extraido = ''
      try {
        extraido = await extrairTextoPdf(buf)
      } catch (e) {
        console.warn('[POST /api/juridico/upload] extração de PDF falhou:', e)
        extraido = ''
      }
      if (!extraido.trim()) {
        return NextResponse.json(
          { error: 'Não consegui ler o texto desse PDF (parece escaneado). Cola o conteúdo como texto?' },
          { status: 422 },
        )
      }
      texto = extraido
      titulo = file.name.replace(/\.pdf$/i, '') || 'Contrato recebido'
      pdfBuf = buf
    } else if (contentType.includes('application/json')) {
      
      const body = (await request.json()) as { texto?: unknown; titulo?: unknown }
      if (typeof body.texto !== 'string' || !body.texto.trim()) {
        return NextResponse.json({ error: 'Cola o teor do contrato.' }, { status: 400 })
      }
      texto = body.texto
      titulo = (typeof body.titulo === 'string' && body.titulo.trim()) ? body.titulo.trim() : 'Contrato recebido'
    } else {
      return NextResponse.json({ error: 'Formato não suportado.' }, { status: 415 })
    }

    const row = await createContrato({
      operatorId: auth.id,
      kind: 'analisado',
      tipo: 'outro',
      titulo,
      status: 'recebido',
      textoOriginal: texto,
    })

    
    if (pdfBuf) {
      try {
        const path = `contratos/${row.id}/original.pdf`
        await serverDb().storage.from('artifacts').upload(path, pdfBuf, { contentType: 'application/pdf', upsert: true })
        await setArquivoRef(row.id, auth.id, path)
      } catch (e) {
        console.warn('[POST /api/juridico/upload] upload do PDF original falhou (não-fatal):', e)
      }
    }

    return NextResponse.json({ ok: true, contrato: toContratoView(row) })
  } catch (err) {
    console.error('[POST /api/juridico/upload]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
