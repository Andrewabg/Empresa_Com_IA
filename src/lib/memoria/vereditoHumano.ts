








export type StatusDaPeca = string

export interface PecaJulgada {
  id: string
  titulo?: string | null
  formato?: string | null
  status: StatusDaPeca
  
  origemRevisao?: string | null
  
  texto?: string | null
}

export interface VereditosDoKit {
  aprovadas: PecaJulgada[]
  refeitas: PecaJulgada[]
  arquivadas: PecaJulgada[]
  
  total: number
}


const APROVADA = new Set(['aprovada', 'no_ar'])
const ARQUIVADA = new Set(['arquivada'])


export function separarPorVeredito(pecas: PecaJulgada[] | null | undefined): VereditosDoKit {
  const lista = (pecas ?? []).filter((p) => p && p.id)
  const aprovadas = lista.filter((p) => APROVADA.has(p.status))
  const arquivadas = lista.filter((p) => ARQUIVADA.has(p.status))
  const refeitas = lista.filter((p) => !!p.origemRevisao?.trim())
  const comVeredito = new Set([...aprovadas, ...arquivadas, ...refeitas].map((p) => p.id))
  return { aprovadas, refeitas, arquivadas, total: comVeredito.size }
}


export const MINIMO_PARA_DESTILAR = 4

export function temSinalSuficiente(v: VereditosDoKit, minimo = MINIMO_PARA_DESTILAR): boolean {
  return v.total >= minimo
}


export function renderVereditos(v: VereditosDoKit, teto = 8): string {
  const linha = (p: PecaJulgada) => {
    const nome = (p.titulo ?? '').trim() || p.formato || 'peça'
    const texto = (p.texto ?? '').trim()
    return `• ${nome}${texto ? ` — "${texto.slice(0, 220)}"` : ''}`
  }
  const L: string[] = []
  if (v.aprovadas.length) L.push('PEÇAS QUE ELE APROVOU:', ...v.aprovadas.slice(0, teto).map(linha))
  if (v.refeitas.length) {
    L.push('PEÇAS QUE ELE MANDOU REFAZER, e o que ele pediu:')
    for (const p of v.refeitas.slice(0, teto)) {
      L.push(`${linha(p)}\n  pedido: "${(p.origemRevisao ?? '').trim().slice(0, 220)}"`)
    }
  }
  if (v.arquivadas.length) L.push('PEÇAS QUE ELE ARQUIVOU SEM USAR:', ...v.arquivadas.slice(0, teto).map(linha))
  return L.join('\n')
}
