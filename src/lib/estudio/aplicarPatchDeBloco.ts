









import { recomporCenas, renderBlocos, type Bloco } from './blocos'
import type { Variacao } from './types'

export interface PatchDeBloco {
  
  variacao: number
  
  blocoId: string
  
  texto: string
}

export interface ResultadoDoPatchDeBloco {
  variacoes: Variacao[]
  mudou: boolean
  recusas: string[]
}


const limpar = (s: string): string =>
  (s ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim()

export function aplicarPatchDeBloco(
  variacoes: Variacao[],
  patch: PatchDeBloco,
): ResultadoDoPatchDeBloco {
  const recusas: string[] = []
  const alvo = variacoes?.[patch.variacao]
  if (!alvo) return { variacoes, mudou: false, recusas: ['Essa versão do texto não existe mais.'] }
  if (!alvo.blocos?.length) {
    return {
      variacoes, mudou: false,
      recusas: ['Esse texto foi escrito antes de o estúdio separar a peça em campos, então não dá para editar campo a campo. Peça uma revisão e a nova já nasce editável.'],
    }
  }

  const i = alvo.blocos.findIndex((b) => b.id === patch.blocoId)
  if (i < 0) return { variacoes, mudou: false, recusas: ['Esse campo não existe nessa peça.'] }

  const bloco = alvo.blocos[i]!
  const texto = limpar(patch.texto)

  
  
  
  if (bloco.cena) {
    const cena = bloco.cena
    if (!texto && !cena.acao && !cena.textoNaTela && !cena.bRoll) {
      return { variacoes, mudou: false, recusas: [`A cena ${bloco.rotulo} ficaria sem nada. Apague a cena numa revisão, ou deixe pelo menos a ação.`] }
    }
    if (texto === cena.fala) return { variacoes, mudou: false, recusas }
    const blocosComFala: Bloco[] = alvo.blocos.map((b, k) => (k === i ? { ...b, cena: { ...cena, fala: texto } } : b))
    const blocos = recomporCenas(blocosComFala)
    const nova: Variacao = { ...alvo, blocos, texto: renderBlocos(blocos) }
    return { variacoes: variacoes.map((v, k) => (k === patch.variacao ? nova : v)), mudou: true, recusas }
  }

  if (!texto) {
    
    
    return { variacoes, mudou: false, recusas: [`O campo ${bloco.rotulo} não pode ficar vazio.`] }
  }
  if (texto === bloco.texto) return { variacoes, mudou: false, recusas }

  
  
  if (typeof bloco.limite === 'number' && texto.length > bloco.limite) {
    recusas.push(`O campo ${bloco.rotulo} passou de ${bloco.limite} caracteres, então parte dele pode ser cortada na plataforma.`)
  }

  const blocos: Bloco[] = alvo.blocos.map((b, k) => (k === i ? { ...b, texto } : b))
  const nova: Variacao = { ...alvo, blocos, texto: renderBlocos(blocos) }
  return {
    variacoes: variacoes.map((v, k) => (k === patch.variacao ? nova : v)),
    mudou: true,
    recusas,
  }
}
