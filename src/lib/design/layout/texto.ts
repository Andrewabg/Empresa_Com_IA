





import type { AlinhamentoH, AlinhamentoV, Caixa, CaixaDeTexto, EspecDeFonte, Medidor } from './tipos'


export const ENTRELINHA_DISPLAY = 1.05

export const ENTRELINHA_CORPO = 1.3


function paragrafos(texto: string): string[][] {
  return (texto ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((p) => p.trim().split(/\s+/).filter(Boolean))
}


export function quebrarEmLinhas(
  texto: string,
  larguraMax: number,
  fonte: EspecDeFonte,
  medir: Medidor,
): string[] {
  const linhas: string[] = []
  for (const palavras of paragrafos(texto)) {
    if (!palavras.length) continue
    let atual = ''
    for (const palavra of palavras) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra
      if (!atual || medir(tentativa, fonte).largura <= larguraMax) {
        atual = tentativa
      } else {
        linhas.push(atual)
        atual = palavra
      }
    }
    if (atual) linhas.push(atual)
  }
  return linhas
}


export function larguraDoBloco(linhas: string[], fonte: EspecDeFonte, medir: Medidor): number {
  let max = 0
  for (const l of linhas) max = Math.max(max, medir(l, fonte).largura)
  return max
}

export interface OpcoesDeAjuste {
  texto: string
  caixa: Caixa
  familia: string
  peso: number
  
  min: number
  max: number
  maxLinhas: number
  entrelinha: number
  medir: Medidor
}


const EPS = 1e-6

interface Tentativa { tamanho: number; linhas: string[]; cabe: boolean }

function tentar(o: OpcoesDeAjuste, tamanho: number): Tentativa {
  const fonte: EspecDeFonte = { familia: o.familia, peso: o.peso, tamanho }
  const linhas = quebrarEmLinhas(o.texto, o.caixa.w, fonte, o.medir)
  const alturaTotal = linhas.length * tamanho * o.entrelinha
  const cabe =
    linhas.length > 0 &&
    linhas.length <= o.maxLinhas &&
    alturaTotal <= o.caixa.h + EPS &&
    larguraDoBloco(linhas, fonte, o.medir) <= o.caixa.w + EPS
  return { tamanho, linhas, cabe }
}


export function ajustarTamanho(o: OpcoesDeAjuste): Tentativa {
  const min = Math.max(1, Math.floor(o.min))
  const max = Math.max(min, Math.floor(o.max))

  let melhor: Tentativa | null = null
  let lo = min
  let hi = max
  while (lo <= hi) {
    const meio = Math.floor((lo + hi) / 2)
    const t = tentar(o, meio)
    if (t.cabe) { melhor = t; lo = meio + 1 } else { hi = meio - 1 }
  }
  
  
  return melhor ?? { ...tentar(o, min), cabe: false }
}

export interface OpcoesDeCaixa extends Omit<OpcoesDeAjuste, 'texto'> {
  texto: string
  alinhamento?: AlinhamentoH
  alinhamentoV?: AlinhamentoV
}


export function montarCaixaDeTexto(o: OpcoesDeCaixa): CaixaDeTexto {
  const ajuste = ajustarTamanho(o)
  const fonte: EspecDeFonte = { familia: o.familia, peso: o.peso, tamanho: ajuste.tamanho }
  const alturaDeLinha = ajuste.tamanho * o.entrelinha
  const alturaTotal = ajuste.linhas.length * alturaDeLinha
  const largura = Math.min(o.caixa.w, larguraDoBloco(ajuste.linhas, fonte, o.medir))

  const alinhamento: AlinhamentoH = o.alinhamento ?? 'esquerda'
  const alinhamentoV: AlinhamentoV = o.alinhamentoV ?? 'topo'

  let x = o.caixa.x
  if (alinhamento === 'centro') x = o.caixa.x + (o.caixa.w - largura) / 2
  else if (alinhamento === 'direita') x = o.caixa.x + (o.caixa.w - largura)

  let y = o.caixa.y
  if (alinhamentoV === 'meio') y = o.caixa.y + (o.caixa.h - alturaTotal) / 2
  else if (alinhamentoV === 'base') y = o.caixa.y + (o.caixa.h - alturaTotal)

  return {
    linhas: ajuste.linhas,
    tamanho: ajuste.tamanho,
    alturaDeLinha,
    caixa: { x, y, w: largura, h: alturaTotal },
    alinhamento,
    familia: o.familia,
    peso: o.peso,
    coube: ajuste.cabe,
  }
}
