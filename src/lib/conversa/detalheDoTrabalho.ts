
import { campoSeguro, copyDoModeloSaneada } from '@/lib/fontes/sanitizar'
import { pluralizar } from '@/lib/trafego/graph/rastro'
import type { Aresta, Incremento } from '@/lib/trafego/graph/tipos'


export const TETO_DO_DETALHE = 60


export const ARESTA_EM_PT: Readonly<Record<Aresta, string>> = {
  insights: 'A CONTA',
  campanhas: 'AS CAMPANHAS',
  conjuntos: 'OS CONJUNTOS',
  anuncios: 'OS ANÚNCIOS',
  criativos: 'OS CRIATIVOS',
  audiencias: 'OS PÚBLICOS',
  detalhes: 'OS DETALHES',
}


export const BREAKDOWN_EM_PT: Readonly<Record<string, string>> = {
  age: 'IDADE',
  gender: 'GÊNERO',
  region: 'REGIÃO',
  country: 'PAÍS',
  publisher_platform: 'CANAL',
  platform_position: 'POSIÇÃO',
  device_platform: 'DISPOSITIVO',
  hourly_stats_aggregated_by_advertiser_time_zone: 'HORA',
  impression_device: 'APARELHO',
  product_id: 'PRODUTO',
}


export const PRESET_EM_PT: Readonly<Record<string, string>> = {
  today: 'HOJE',
  yesterday: 'ONTEM',
  last_3d: '3 DIAS',
  last_7d: '7 DIAS',
  last_14d: '14 DIAS',
  last_28d: '28 DIAS',
  last_30d: '30 DIAS',
  last_90d: '90 DIAS',
  this_month: 'ESTE MÊS',
  last_month: 'MÊS PASSADO',
  this_quarter: 'ESTE TRIMESTRE',
  maximum: 'TODO O PERÍODO',
}


export const INCREMENTO_EM_PT: Readonly<Record<Exclude<Incremento, 'total'>, string>> = {
  dia: 'DIA A DIA',
  semana: 'SEMANA A SEMANA',
  mes: 'MÊS A MÊS',
}

const PREFIXO_DA_LEITURA = 'LENDO'
const PREPOSICAO_DO_BREAKDOWN = 'POR'
const LIGACAO_DO_BREAKDOWN = 'E'

export const DETALHE_DO_CALCULO = 'CRUZANDO OS NÚMEROS'
const CONTADOR_LEITURA = ['LEITURA', 'LEITURAS'] as const
const CONTADOR_CRUZAMENTO = ['CRUZAMENTO', 'CRUZAMENTOS'] as const

const SEPARADOR = '·'


export const VOCABULARIO_DA_ETIQUETA: readonly string[] = [
  PREFIXO_DA_LEITURA,
  PREPOSICAO_DO_BREAKDOWN,
  LIGACAO_DO_BREAKDOWN,
  DETALHE_DO_CALCULO,
  SEPARADOR,
  ...CONTADOR_LEITURA,
  ...CONTADOR_CRUZAMENTO,
  ...Object.values(ARESTA_EM_PT),
  ...Object.values(BREAKDOWN_EM_PT),
  ...Object.values(PRESET_EM_PT),
  ...Object.values(INCREMENTO_EM_PT),
]


function comoObjeto(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}


function noTeto(s: string): string {
  return [...s].slice(0, TETO_DO_DETALHE).join('').trimEnd()
}


function traduzir<K extends string>(mapa: Readonly<Record<K, string>>, chave: unknown): string | undefined {
  if (typeof chave !== 'string' || !Object.hasOwn(mapa, chave)) return undefined
  return (mapa as Readonly<Record<string, string>>)[chave]
}


function detalheDoPorque(args: Record<string, unknown>): string | null {
  const bruto = args.porque
  if (typeof bruto !== 'string') return null
  const limpo = copyDoModeloSaneada(campoSeguro(bruto)).toUpperCase()
  return limpo ? noTeto(limpo) : null
}


function detalheDaLeitura(args: Record<string, unknown>): string | null {
  const aresta = traduzir(ARESTA_EM_PT, args.aresta)
  if (!aresta) return null

  const partes: string[] = []
  const breakdowns = Array.isArray(args.breakdowns)
    ? args.breakdowns.map((b) => traduzir(BREAKDOWN_EM_PT, b)).filter((b): b is string => Boolean(b))
    : []
  if (breakdowns.length) {
    partes.push(` ${PREPOSICAO_DO_BREAKDOWN} ${breakdowns.join(` ${LIGACAO_DO_BREAKDOWN} `)}`)
  }

  const periodo = comoObjeto(args.periodo)
  const preset = traduzir(PRESET_EM_PT, periodo?.preset)
  if (preset) partes.push(`, ${preset}`)
  const incremento = traduzir(INCREMENTO_EM_PT, periodo?.incremento)
  if (incremento) partes.push(`, ${incremento}`)

  let texto = `${PREFIXO_DA_LEITURA} ${aresta}`
  for (const parte of partes) {
    if ([...texto].length + [...parte].length > TETO_DO_DETALHE) break
    texto += parte
  }
  return texto
}


export function detalheDoTrabalho(tool: string, args: unknown): string | null {
  const objeto = comoObjeto(args)
  if (tool === 'consultarMeta') {
    if (!objeto) return null
    return detalheDoPorque(objeto) ?? detalheDaLeitura(objeto)
  }
  if (tool === 'calcular') {
    return (objeto ? detalheDoPorque(objeto) : null) ?? DETALHE_DO_CALCULO
  }
  return null
}


export function contadorDaInvestigacao(r: { leituras: number; cruzamentos: number }): string | null {
  if (r.leituras <= 0 && r.cruzamentos <= 0) return null
  const leituras = pluralizar(r.leituras, ...CONTADOR_LEITURA)
  const cruzamentos = pluralizar(r.cruzamentos, ...CONTADOR_CRUZAMENTO)
  return `${r.leituras} ${leituras} ${SEPARADOR} ${r.cruzamentos} ${cruzamentos}`
}
