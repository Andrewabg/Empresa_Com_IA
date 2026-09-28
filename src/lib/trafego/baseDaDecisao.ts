

















import { fmtBRL } from './format'
import { CONV_MIN_VEREDITO, ehTendenciaSustentada } from './sinais'
import { numeroDaMetrica } from './normalize'
import { pluralizar } from './graph/rastro'
import { campoSeguro, copyDoModeloSaneada } from '@/lib/fontes/sanitizar'
import { ROTULO_PORQUE, ROTULO_BASE, ROTULO_AVISO, ROTULO_EVIDENCIA } from '@/lib/aprovacoes/rotulosDaBase'





export { ROTULO_PORQUE, ROTULO_BASE, ROTULO_AVISO, ROTULO_EVIDENCIA, ehReasonDaBase } from '@/lib/aprovacoes/rotulosDaBase'


export interface SnapshotDaBase {
  metrics: Record<string, unknown>
  period_start?: string
  period_end?: string
}

export interface BaseDaDecisao {
  conversoes?: number
  gasto?: number
  periodo?: string
  avisoDeAmostra: string | null
}


export type TipoDaBase = 'pausar' | 'reativar' | 'orcamento' | 'bid' | 'targeting'


export const TETO_DA_EVIDENCIA = 300


const PRECISAM_DE_AMOSTRA: ReadonlySet<TipoDaBase> = new Set(['pausar', 'orcamento'])

const CONVERSAO = ['conversão', 'conversões'] as const
const DIA = ['dia', 'dias'] as const


function diaEmMs(iso?: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}


function diasDoPeriodo(inicio?: string, fim?: string): number | undefined {
  const a = diaEmMs(inicio)
  const b = diaEmMs(fim)
  if (a === null || b === null) return undefined
  const dias = Math.floor((b - a) / 86_400_000) + 1
  return dias > 0 ? dias : undefined
}


function diaEMes(iso?: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return m ? `${m[3]}/${m[2]}` : null
}


export function periodoLegivel(inicio?: string, fim?: string): string | undefined {
  const a = diaEMes(inicio)
  const b = diaEMes(fim)
  if (!a && !b) return undefined
  if (!a || !b) return a ?? b ?? undefined
  return a === b ? a : `${a} a ${b}`
}


export function textoDoAviso(conversoes: number, dias?: number): string {
  const n = Math.round(conversoes)
  const quanto = `${n} ${pluralizar(n, ...CONVERSAO)}`
  const janela = dias !== undefined ? ` em ${dias} ${pluralizar(dias, ...DIA)}` : ''
  return `amostra pequena (${quanto}${janela}); confirme antes de agir`
}


export function textoDaBase(b: BaseDaDecisao): string {
  const partes: string[] = []
  if (b.conversoes !== undefined) {
    const n = Math.round(b.conversoes)
    partes.push(`${n} ${pluralizar(n, ...CONVERSAO)}`)
  }
  if (b.gasto !== undefined) partes.push(`${fmtBRL(b.gasto)} gastos`)
  if (b.periodo) partes.push(b.periodo)
  return partes.join(', ')
}


export function baseDaDecisao(
  snap: SnapshotDaBase | null,
  tipo: TipoDaBase,
  sinais?: ReadonlyArray<{ tipo: string }>,
): BaseDaDecisao {
  if (!snap) return { avisoDeAmostra: null }
  const metrics = snap.metrics ?? {}
  const conversoes = numeroDaMetrica(metrics.conversions)
  const gasto = numeroDaMetrica(metrics.spend)
  const periodo = periodoLegivel(snap.period_start, snap.period_end)

  let avisoDeAmostra: string | null = null
  if (PRECISAM_DE_AMOSTRA.has(tipo) && conversoes !== undefined && conversoes < CONV_MIN_VEREDITO) {
    
    
    
    const corteSustentado = tipo === 'pausar' && ehTendenciaSustentada(sinais)
    if (!corteSustentado) {
      avisoDeAmostra = textoDoAviso(conversoes, diasDoPeriodo(snap.period_start, snap.period_end))
    }
  }

  return {
    ...(conversoes !== undefined ? { conversoes } : {}),
    ...(gasto !== undefined ? { gasto } : {}),
    ...(periodo ? { periodo } : {}),
    avisoDeAmostra,
  }
}


function textoDoModelo(bruto: string | undefined, teto?: number): string {
  const limpo = copyDoModeloSaneada(campoSeguro(bruto ?? null))
  return teto === undefined ? limpo : [...limpo].slice(0, teto).join('').trimEnd()
}


export function montarReason(i: { porque?: string; base: BaseDaDecisao; evidencia?: string }): string {
  const linhas: string[] = []
  const porque = textoDoModelo(i.porque)
  if (porque) linhas.push(`${ROTULO_PORQUE} ${porque}`)
  const base = textoDaBase(i.base)
  if (base) linhas.push(`${ROTULO_BASE} ${base}`)
  if (i.base.avisoDeAmostra) linhas.push(`${ROTULO_AVISO} ${i.base.avisoDeAmostra}`)
  const evidencia = textoDoModelo(i.evidencia, TETO_DA_EVIDENCIA)
  if (evidencia) linhas.push(`${ROTULO_EVIDENCIA} ${evidencia}`)
  return linhas.join('\n')
}


export const MENSAGENS_DA_BASE: readonly string[] = [
  ROTULO_PORQUE,
  ROTULO_BASE,
  ROTULO_AVISO,
  ROTULO_EVIDENCIA,
  textoDoAviso(1, 1),
  textoDoAviso(12, 7),
  textoDoAviso(12),
  textoDaBase({ conversoes: 1, gasto: 1, periodo: periodoLegivel('2026-09-07', '2026-09-07'), avisoDeAmostra: null }),
  textoDaBase({ conversoes: 12, gasto: 1234, periodo: periodoLegivel('2026-09-01', '2026-09-07'), avisoDeAmostra: null }),
]
