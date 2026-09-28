
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { requireOperatorApi, requireDonoApi } from '@/server/auth/apiAuth'
import { getDefaultBrand } from '@/data/brands'
import { getDirecaoArte, upsertDirecaoArte } from '@/data/brandVoice'
import { createArtifact } from '@/data/artifacts'
import { serverDb } from '@/server/supabase'
import { validarImagem, COPY_UPLOAD } from '@/lib/design/uploadDeImagem'
import { mergeDirecaoArte, type DirecaoArtePatch } from '@/lib/design/direcaoArte'
import { paletaDoLogo } from '@/server/design/paletaDoLogo'
import { coresNovas } from '@/lib/design/paletaDaLogo'

const SEM_MARCA = 'Ainda não conheço a sua marca. Converse com o Téo no estúdio primeiro.'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth
  const dono = await requireDonoApi(cookieStore)
  if (dono instanceof Response) return dono

  let file: File
  let mono = false
  try {
    const form = await request.formData()
    const f = form.get('file')
    if (!(f instanceof File)) return NextResponse.json({ error: COPY_UPLOAD.semArquivo }, { status: 400 })
    file = f
    mono = form.get('mono') === '1'
  } catch {
    return NextResponse.json({ error: COPY_UPLOAD.formInvalido }, { status: 400 })
  }

  const v = validarImagem(file)
  if (!v.ok) return NextResponse.json({ error: v.erro }, { status: 400 })

  try {
    const brand = await getDefaultBrand(auth.id)
    if (!brand) return NextResponse.json({ error: SEM_MARCA }, { status: 409 })

    const bytes = Buffer.from(await file.arrayBuffer())
    
    
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
    const path = `marca/${brand.id}/${mono ? 'mono-' : ''}${hash}.${v.ext}`
    const { error } = await serverDb().storage
      .from('artifacts').upload(path, bytes, { contentType: file.type, upsert: true })
    if (error) throw new Error(error.message)

    const artifact = await createArtifact({
      conversation_id: null, agent_id: 'operador', kind: 'imagem',
      title: `Logo da marca${mono ? ' (mono)' : ''}`, storage_ref: path,
    })

    const atual = await getDirecaoArte(auth.id, brand.id)
    const patch: DirecaoArtePatch = mono
      ? { logoMonoArtifactId: artifact.id }
      : { logoArtifactId: artifact.id }
    const direcao = mergeDirecaoArte(atual, patch, { origem: 'operador', at: new Date().toISOString() })
    await upsertDirecaoArte(auth.id, brand.id, direcao)

    
    
    const sugestao = mono ? [] : coresNovas(await paletaDoLogo(artifact.id), direcao.paleta)

    return NextResponse.json({ ok: true, direcao, ...(sugestao.length ? { sugestao } : {}) })
  } catch (err) {
    console.error('[POST /api/design/marca/logo]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
