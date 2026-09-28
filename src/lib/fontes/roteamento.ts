















import { ROTULO_MAX, VALOR_MAX } from '@/lib/memory/fichaEmpresa'

export interface Destilado {
  fatos: { rotulo: string; valor: string }[]
  corpoDaNota: string
}


const CONTEM_NUMERO = /\d/


const VALOR_ATOMICO_MAX = 60


const ROTULO_PALAVRAS_MAX = 6
const PONTUACAO_DE_FRASE = /[.!?:;]/

function rotuloAtomico(rotulo: string): boolean {
  if (rotulo.length > VALOR_ATOMICO_MAX) return false
  if (PONTUACAO_DE_FRASE.test(rotulo)) return false
  return rotulo.split(/\s+/).length <= ROTULO_PALAVRAS_MAX
}

export function rotear(d: Destilado): {
  paraFicha: { rotulo: string; valor: string }[]
  paraNota: string
} {
  const paraFicha = d.fatos.filter((f) => {
    const rotulo = f.rotulo.trim()
    const valor = f.valor.trim()
    if (!rotulo || !valor) return false
    if (rotulo.length > ROTULO_MAX || valor.length > VALOR_MAX) return false
    if (!rotuloAtomico(rotulo)) return false
    return valor.length <= VALOR_ATOMICO_MAX && CONTEM_NUMERO.test(valor)
  })
  return { paraFicha, paraNota: d.corpoDaNota }
}
