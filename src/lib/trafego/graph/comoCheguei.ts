


















import { campoSeguro, copyDoModeloSaneada } from '@/lib/fontes/sanitizar'
import { contadorDaInvestigacao } from '@/lib/conversa/detalheDoTrabalho'
import { MAX_FIRME, SEM_PORQUE, type Ledger } from './ledger'
import { pluralizar } from './rastro'


export interface InvestigacaoResumo {
  
  leituras: Array<{ porque: string; linhas: number }>
  
  cruzamentos: Array<{ porque: string }>
  
  firme: string[]
  
  contador: string
}


export const TETO_DO_TEXTO_NO_CARD = 80

export const TITULO_DO_CARD = 'Como cheguei nisso'
export const ROTULO_DAS_LEITURAS = 'O que eu li'
export const ROTULO_DOS_CRUZAMENTOS = 'O que eu cruzei'
export const ROTULO_DO_FIRME = 'O que ficou firme'
const LINHA = ['linha', 'linhas'] as const


export function textoDasLinhas(n: number): string {
  return `${n} ${pluralizar(n, ...LINHA)}`
}


export const COPY_DO_CARD: readonly string[] = [
  TITULO_DO_CARD,
  ROTULO_DAS_LEITURAS,
  ROTULO_DOS_CRUZAMENTOS,
  ROTULO_DO_FIRME,
  SEM_PORQUE,
  textoDasLinhas(1),
  textoDasLinhas(2),
]


function textoDoCard(bruto: unknown): string {
  if (typeof bruto !== 'string') return ''
  const limpo = copyDoModeloSaneada(campoSeguro(bruto))
  return [...limpo].slice(0, TETO_DO_TEXTO_NO_CARD).join('').trimEnd()
}


function porqueDoCard(bruto: unknown): string {
  return textoDoCard(bruto) || SEM_PORQUE
}


function contagem(bruto: unknown): number {
  return typeof bruto === 'number' && Number.isFinite(bruto) && bruto > 0 ? Math.floor(bruto) : 0
}


export function resumoParaOCard(l: Ledger): InvestigacaoResumo {
  return {
    leituras: l.leituras.map((e) => ({ porque: porqueDoCard(e.porque), linhas: contagem(e.linhas) })),
    cruzamentos: l.calculos.map((c) => ({ porque: porqueDoCard(c.porque) })),
    firme: l.firme.map((f) => textoDoCard(f)).filter(Boolean).slice(0, MAX_FIRME),
    contador: contadorDaInvestigacao({ leituras: l.leituras.length, cruzamentos: l.totalDeCalculos }) ?? '',
  }
}


export function investigacaoDoPayload(bruto: unknown): InvestigacaoResumo | null {
  if (!bruto || typeof bruto !== 'object') return null
  const objeto = bruto as Record<string, unknown>

  const leituras: InvestigacaoResumo['leituras'] = []
  if (Array.isArray(objeto.leituras)) {
    for (const item of objeto.leituras) {
      if (!item || typeof item !== 'object') continue
      const { porque, linhas } = item as Record<string, unknown>
      leituras.push({ porque: porqueDoCard(porque), linhas: contagem(linhas) })
    }
  }

  const cruzamentos: InvestigacaoResumo['cruzamentos'] = []
  if (Array.isArray(objeto.cruzamentos)) {
    for (const item of objeto.cruzamentos) {
      if (!item || typeof item !== 'object') continue
      cruzamentos.push({ porque: porqueDoCard((item as Record<string, unknown>).porque) })
    }
  }

  const firme = Array.isArray(objeto.firme)
    ? objeto.firme.map((f) => textoDoCard(f)).filter(Boolean).slice(0, MAX_FIRME)
    : []

  if (!leituras.length && !cruzamentos.length && !firme.length) return null
  return { leituras, cruzamentos, firme, contador: textoDoCard(objeto.contador) }
}
