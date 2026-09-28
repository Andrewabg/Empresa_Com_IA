
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi, requireDonoApi } from '@/server/auth/apiAuth'
import { getDefaultBrand } from '@/data/brands'
import { getDirecaoArte, upsertDirecaoArte } from '@/data/brandVoice'
import {
  removerAprendizadoVisual, removerCorDaPaleta, mergeDirecaoArte,
  EMPTY_DIRECAO_ARTE, type PapelDaCor, type DirecaoArtePatch,
} from '@/lib/design/direcaoArte'
import { paletaDoLogo } from '@/server/design/paletaDoLogo'


const HEX = /^#[0-9a-fA-F]{6}$/
const PAPEIS: PapelDaCor[] = ['primaria', 'secundaria', 'fundo', 'texto', 'destaque']
const txt = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

export async function GET() {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  try {
    const brand = await getDefaultBrand(auth.id)
    if (!brand) return NextResponse.json({ ok: true, direcao: EMPTY_DIRECAO_ARTE })
    const direcao = await getDirecaoArte(auth.id, brand.id)
    return NextResponse.json({ ok: true, direcao })
  } catch (err) {
    console.error('[GET /api/design/direcao]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireOperatorApi(cookieStore)
  if (auth instanceof Response) return auth

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = body.action
  const ACOES = ['remover_aprendizado', 'remover_cor', 'definir_logo', 'definir_tipografia', 'adicionar_cor']
  if (typeof action !== 'string' || !ACOES.includes(action)) {
    return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 })
  }

  
  
  const dono = await requireDonoApi(cookieStore)
  if (dono instanceof Response) return dono

  try {
    const brand = await getDefaultBrand(auth.id)
    
    if (!brand) return NextResponse.json({ ok: false })

    const atual = await getDirecaoArte(auth.id, brand.id)
    let direcao = atual
    let sugestao: { hex: string; peso: number }[] | undefined

    if (action === 'remover_aprendizado') {
      const texto = txt(body.texto)
      if (!texto) return NextResponse.json({ error: 'texto é obrigatório' }, { status: 400 })
      direcao = removerAprendizadoVisual(atual, texto)
    } else if (action === 'remover_cor') {
      const hex = txt(body.hex)
      if (!hex) return NextResponse.json({ error: 'hex é obrigatório' }, { status: 400 })
      direcao = removerCorDaPaleta(atual, hex)
    } else if (action === 'adicionar_cor') {
      const hex = txt(body.hex)
      if (!HEX.test(hex)) return NextResponse.json({ error: 'Use uma cor no formato #RRGGBB.' }, { status: 400 })
      const papelCru = txt(body.papel) as PapelDaCor
      const papel = PAPEIS.includes(papelCru) ? papelCru : undefined
      const patch: DirecaoArtePatch = { paleta: [{ hex, nome: txt(body.nome) || hex, ...(papel ? { papel } : {}) }] }
      direcao = mergeDirecaoArte(atual, patch, { origem: 'operador', at: new Date().toISOString() })
    } else if (action === 'definir_tipografia') {
      const display = txt(body.display)
      const corpo = txt(body.corpo)
      if (!display && !corpo) return NextResponse.json({ error: 'Informe ao menos uma família.' }, { status: 400 })
      direcao = mergeDirecaoArte(atual, { tipografia: { display, corpo } }, { origem: 'operador', at: new Date().toISOString() })
    } else {
      const artifactId = txt(body.artifactId)
      if (!artifactId) return NextResponse.json({ error: 'artifactId é obrigatório' }, { status: 400 })
      const mono = body.mono === true
      const patch: DirecaoArtePatch = mono ? { logoMonoArtifactId: artifactId } : { logoArtifactId: artifactId }
      direcao = mergeDirecaoArte(atual, patch, { origem: 'operador', at: new Date().toISOString() })
      
      
      if (!mono) sugestao = await paletaDoLogo(artifactId)
    }

    await upsertDirecaoArte(auth.id, brand.id, direcao)
    return NextResponse.json({ ok: true, direcao, ...(sugestao?.length ? { sugestao } : {}) })
  } catch (err) {
    console.error('[PATCH /api/design/direcao]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
