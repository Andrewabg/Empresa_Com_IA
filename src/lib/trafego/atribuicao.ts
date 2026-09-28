



const DIA_MS = 24 * 60 * 60 * 1000

export const LIMIAR = 0.15
const EPS = 1e-9

export const JANELA_MEDICAO_MS = 7 * DIA_MS

export const GAP_LEARNING_MS = 4 * DIA_MS

export const JANELA_ANTES_MS = 3 * DIA_MS

export const JANELA_APRENDIZADO_MS = 30 * DIA_MS

export const CONV_MIN_RESULTADO = 25

export type Veredito = 'ajudou' | 'atrapalhou' | 'inconclusivo'


export interface ResultadoAcao {
  veredito: Veredito
  motivo: string
  entidadeAntes?: number
  entidadeDepois?: number
  contaAntes?: number
  contaDepois?: number
  deltaRelEntidade?: number
  deltaRelConta?: number
  deltaLiquido?: number
}

export interface DadosResultado {
  metrica: 'roas' | 'cpa'
  direcao: 'maior_melhor' | 'menor_melhor'
  entidadeAntes?: number
  entidadeDepois?: number
  contaAntes?: number
  contaDepois?: number
  
  convDepois?: number
}


export function avaliarResultado(dados: DadosResultado): ResultadoAcao {
  const { metrica, direcao, entidadeAntes, entidadeDepois, contaAntes, contaDepois } = dados
  if (entidadeAntes === undefined || entidadeDepois === undefined || !(entidadeAntes > 0)) {
    return { veredito: 'inconclusivo', motivo: 'sem histórico suficiente pra medir o resultado.' }
  }
  
  if (dados.convDepois !== undefined && dados.convDepois < CONV_MIN_RESULTADO) {
    return { veredito: 'inconclusivo', motivo: `amostra insuficiente na janela (${dados.convDepois} conv) — sem sinal confiável.` }
  }
  const deltaRelEntidade = (entidadeDepois - entidadeAntes) / entidadeAntes
  const deltaRelConta =
    contaAntes !== undefined && contaAntes > 0 && contaDepois !== undefined
      ? (contaDepois - contaAntes) / contaAntes
      : 0
  let deltaLiquido = deltaRelEntidade - deltaRelConta
  if (direcao === 'menor_melhor') deltaLiquido *= -1 

  const comuns = { entidadeAntes, entidadeDepois, deltaRelEntidade, deltaRelConta, deltaLiquido,
    ...(contaAntes !== undefined ? { contaAntes } : {}), ...(contaDepois !== undefined ? { contaDepois } : {}) }

  if (deltaLiquido > LIMIAR + EPS) {
    return { veredito: 'ajudou', motivo: motivoDe('ajudou', metrica, deltaRelEntidade, deltaRelConta), ...comuns }
  }
  if (deltaLiquido < -(LIMIAR + EPS)) {
    return { veredito: 'atrapalhou', motivo: motivoDe('atrapalhou', metrica, deltaRelEntidade, deltaRelConta), ...comuns }
  }
  return { veredito: 'inconclusivo', motivo: 'o movimento acompanhou a conta — sem sinal claro de efeito.', ...comuns }
}

function pct(x: number): string { return `${x >= 0 ? '+' : ''}${Math.round(x * 100)}%` }
function motivoDe(v: 'ajudou' | 'atrapalhou', metrica: string, dEnt: number, dConta: number): string {
  const mnome = metrica.toUpperCase()
  return `${mnome} da entidade ${pct(dEnt)} vs a conta ${pct(dConta)} — a mudança ${v === 'ajudou' ? 'ajudou' : 'atrapalhou'}.`
}


function ddmm(iso: string): string { return `${iso.slice(8, 10)}/${iso.slice(5, 7)}` }
function n1(x: number | undefined): string { return x === undefined ? '?' : x.toFixed(1) }


export function renderAvisoResultado(r: ResultadoAcao, dataAcaoISO: string): string {
  if (r.veredito !== 'atrapalhou') return ''
  return `da última vez que mexi no orçamento aqui (${ddmm(dataAcaoISO)}), a métrica caiu de ${n1(r.entidadeAntes)} pra ${n1(r.entidadeDepois)} vs o normal da conta — confirme se é hora.`
}
