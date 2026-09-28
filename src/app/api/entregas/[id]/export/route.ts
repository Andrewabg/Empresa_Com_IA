
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import AdmZip from 'adm-zip'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getArtifact } from '@/data/artifacts'
import { getCampanha, toCampanhaView } from '@/data/campanhas'
import { listArtesDasEntregas, listPecasComUltimaVersao } from '@/data/pecas'
import { serverDb } from '@/server/supabase'
import { indexarArtesPorSlot } from '@/lib/entrega/artes'
import { copyEmMarkdown, leiaMe, planoDePacote, slugDoNome, type CopyDoItem } from '@/lib/entrega/export'
import { montarEntrega } from '@/lib/entrega/progresso'
import type { Variacao } from '@/lib/estudio/types'


async function bytesDoArtefato(artifactId: string): Promise<Buffer | null> {
  try {
    const art = await getArtifact(artifactId)
    if (!art?.storage_ref) return null
    const { data, error } = await serverDb().storage.from('artifacts').download(art.storage_ref)
    if (error || !data) return null
    return Buffer.from(await data.arrayBuffer())
  } catch {
    return null
  }
}


function copyDaPeca(versao: { variacoes?: unknown; veredito?: unknown } | null | undefined): CopyDoItem | null {
  const vars = Array.isArray(versao?.variacoes) ? (versao.variacoes as Variacao[]) : []
  if (!vars.length) return null
  const escolhida = (versao?.veredito as { escolhida?: number } | undefined)?.escolhida ?? 0
  const v = vars[escolhida] ?? vars[0]!
  const blocos = [...(v.blocos ?? [])].sort((a, b) => a.ordem - b.ordem)
  const campos = blocos
    .filter((b) => (b.texto ?? '').trim())
    .map((b) => ({ rotulo: b.rotulo || b.kind, texto: b.texto }))
  
  
  if (!campos.length && (v.texto ?? '').trim()) return { campos: [{ rotulo: 'Texto', texto: v.texto }] }
  return campos.length ? { campos } : null
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params

  try {
    const campanha = await getCampanha(id)
    
    if (!campanha || campanha.operator_id !== auth.id) {
      return NextResponse.json({ error: 'Não achei essa entrega.' }, { status: 404 })
    }
    const view = toCampanhaView(campanha)

    const [artesPorCampanha, pecas] = await Promise.all([
      listArtesDasEntregas(auth.id, [id]).catch(() => ({}) as Record<string, never[]>),
      listPecasComUltimaVersao(auth.id, view.brandId).catch(() => []),
    ])
    const entrega = montarEntrega(view, indexarArtesPorSlot(artesPorCampanha[id] ?? []))

    const porId = new Map(pecas.map((p) => [p.id, p]))
    const copyPorItem: Record<number, CopyDoItem | null> = {}
    for (const item of entrega.itens) {
      copyPorItem[item.indice] = item.pecaId ? copyDaPeca(porId.get(item.pecaId)?.ultimaVersao) : null
    }

    const plano = planoDePacote(entrega.itens, copyPorItem)
    const zip = new AdmZip()
    let artesFaltando = 0
    for (const entrada of plano.entradas) {
      if (entrada.fonte.tipo === 'texto') {
        zip.addFile(entrada.caminho, Buffer.from(entrada.fonte.conteudo, 'utf8'))
        continue
      }
      const bytes = await bytesDoArtefato(entrada.fonte.artifactId)
      if (bytes) zip.addFile(entrada.caminho, bytes)
      else artesFaltando++
    }
    const aviso = artesFaltando
      ? `\n${artesFaltando} ${artesFaltando === 1 ? 'arte não abriu' : 'artes não abriram'} na hora de montar o pacote e ${artesFaltando === 1 ? 'ficou' : 'ficaram'} de fora. Baixe de novo mais tarde.\n`
      : ''
    zip.addFile('LEIA-ME.md', Buffer.from(leiaMe(entrega.nome, plano, entrega.itens) + aviso, 'utf8'))

    const arquivo = `${slugDoNome(entrega.nome)}.zip`
    return new NextResponse(new Uint8Array(zip.toBuffer()), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${arquivo}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/entregas/[id]/export]', err)
    return NextResponse.json({ error: 'Não consegui montar o pacote agora.' }, { status: 500 })
  }
}
