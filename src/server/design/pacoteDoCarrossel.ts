







import AdmZip from 'adm-zip'
import { getPecaComVersoes as getPecaImpl } from '@/data/pecas'
import { defaultBaixarReferencia } from '@/server/tools/design/gerarCriativo'
import { nomeDoArquivoDoSlide, nomeDoPacote } from '@/lib/design/carrossel'
import { toCriativoView, type SlideDoCarrossel } from '@/lib/design/types'

export interface PacoteDoCarrosselDeps {
  getPecaComVersoes?: typeof getPecaImpl
  
  baixar?: (artifactId: string) => Promise<Buffer | null>
}

export type ResultadoDoPacote =
  | { ok: true; nome: string; zip: Buffer; slides: number; faltaram: number }
  | { ok: false; erro: string }

export const COPY_PACOTE = {
  inexistente: 'Não achei esse criativo.',
  naoEhSerie: 'Essa peça não é um carrossel, então não há série para baixar.',
  semArquivo: 'Não consegui recuperar nenhum slide desta série agora.',
} as const


export function slidesDaPeca(variacoes: { slides?: SlideDoCarrossel[] }[]): SlideDoCarrossel[] {
  const comSlides = (variacoes ?? []).find((v) => Array.isArray(v.slides) && v.slides.length)
  return [...(comSlides?.slides ?? [])].sort((a, b) => a.ordem - b.ordem)
}

export async function montarPacoteDoCarrossel(
  input: { pecaId: string; operatorId: string },
  deps: PacoteDoCarrosselDeps = {},
): Promise<ResultadoDoPacote> {
  const getPeca = deps.getPecaComVersoes ?? getPecaImpl
  const baixar = deps.baixar ?? defaultBaixarReferencia

  const peca = await getPeca(input.pecaId)
  
  if (!peca || peca.operator_id !== input.operatorId) return { ok: false, erro: COPY_PACOTE.inexistente }

  const view = toCriativoView(peca, peca.versoes[peca.versoes.length - 1])
  const slides = slidesDaPeca(view.variacoes)
  if (!slides.length) return { ok: false, erro: COPY_PACOTE.naoEhSerie }

  const zip = new AdmZip()
  let faltaram = 0
  
  
  for (const s of slides) {
    const bytes = await baixar(s.artifactId).catch(() => null)
    if (!bytes) { faltaram++; continue }
    zip.addFile(nomeDoArquivoDoSlide(s.ordem, s.papel), bytes)
  }
  const guardados = slides.length - faltaram
  if (!guardados) return { ok: false, erro: COPY_PACOTE.semArquivo }

  return { ok: true, nome: nomeDoPacote(view.titulo), zip: zip.toBuffer(), slides: guardados, faltaram }
}
