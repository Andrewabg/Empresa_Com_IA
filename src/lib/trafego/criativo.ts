




import type { MetricShape } from '@/lib/trafego/types'
import type { FrameConta } from '@/lib/trafego/perfilConta'
import type { AccountBaseline, FaixaNormal } from '@/lib/trafego/baseline'
import { avaliarVsNormal } from '@/lib/trafego/baseline'
import type { BenchmarkNicho } from '@/lib/trafego/benchmarks'
import { faixaDeBenchmark } from '@/lib/trafego/benchmarks'
import { CTR_BAIXO } from '@/lib/trafego/diagnostico'
import { fmtBRL } from '@/lib/trafego/format'
import { cpaTeto } from '@/lib/trafego/economia'


export const HOOK_MEDIANO = 0.28 
export const HOOK_BOM = 0.30
export const HOOK_ESCALA = 0.35

export const HOLD_FRACO = 0.15

export const RUIDO_MULT = 3
export const RUIDO_PISO_BRL = 100


export const FREQ_SATURACAO = 3

export type CausaCriativo = 'hook' | 'hold' | 'ctr_cta' | 'downstream' | 'saudavel' | 'cedo'

export interface DiagCriativo {
  id: string
  nome: string
  causa: CausaCriativo
  
  diagnostico: string
  
  acao: string
  
  teste?: string
  
  hookRate?: number; holdRate?: number; ctr?: number; cpa?: number; roas?: number; spend?: number
}

export interface DiagCriativoInput {
  id: string
  nome: string | null
  m: MetricShape
  
  baseline?: AccountBaseline | null
  
  cpaAlvo?: number
  
  benchmark?: BenchmarkNicho
  
  frame?: FrameConta
}

const pct = (x: number): string => `${Math.round(x * 100)}%`


function faixaDe(baseline: AccountBaseline | null, metric: string): FaixaNormal | undefined {
  if (!baseline || !baseline.suficiente) return undefined
  return baseline.faixas[metric]
}

function ctrFraco(ctr: number | undefined, faixa: FaixaNormal | undefined, benchFaixa?: FaixaNormal): boolean {
  if (ctr === undefined) return false
  if (faixa) return avaliarVsNormal(ctr, faixa).posicao === 'abaixo'
  if (benchFaixa) return avaliarVsNormal(ctr, benchFaixa).posicao === 'abaixo'
  return ctr < CTR_BAIXO
}

function cpaAlto(cpa: number | undefined, faixa: FaixaNormal | undefined): boolean {
  return cpa !== undefined && faixa !== undefined && avaliarVsNormal(cpa, faixa).posicao === 'acima'
}

function roasBaixo(roas: number | undefined, faixa: FaixaNormal | undefined): boolean {
  return roas !== undefined && faixa !== undefined && avaliarVsNormal(roas, faixa).posicao === 'abaixo'
}
function limiarRuido(cpaAlvo: number | undefined): number {
  return Math.max(cpaAlvo !== undefined ? cpaAlvo * RUIDO_MULT : 0, RUIDO_PISO_BRL)
}

export function diagnosticarCriativo(input: DiagCriativoInput): DiagCriativo {
  const { id, m } = input
  const nome = input.nome ?? '(sem nome)'
  const baseline = input.baseline ?? null
  const bench = input.benchmark
  
  
  
  const cpaAlvo = input.cpaAlvo
    ?? cpaTeto({ ticket: input.frame?.ticket, margem: input.frame?.margem })
    ?? faixaDe(baseline, 'cpa')?.mediana
  
  
  const hookFraco = bench?.hook?.baixo ?? HOOK_MEDIANO
  const hookEscala = bench?.hook?.alto ?? HOOK_ESCALA
  
  const benchCtrFaixa = bench?.ctr ? faixaDeBenchmark(bench.ctr) : undefined
  const hook = m.video?.hook_rate
  const hold = m.video?.hold_rate
  const isVideo = hook !== undefined || hold !== undefined

  const eco: Partial<DiagCriativo> = {
    ...(hook !== undefined ? { hookRate: hook } : {}),
    ...(hold !== undefined ? { holdRate: hold } : {}),
    ...(m.ctr !== undefined ? { ctr: m.ctr } : {}),
    ...(m.cpa !== undefined ? { cpa: m.cpa } : {}),
    ...(m.roas !== undefined ? { roas: m.roas } : {}),
    ...(m.spend !== undefined ? { spend: m.spend } : {}),
  }
  const mk = (causa: CausaCriativo, diagnostico: string, acao: string): DiagCriativo =>
    ({ id, nome, causa, diagnostico, acao, ...eco })

  
  
  const spend = Number.isFinite(m.spend) ? (m.spend as number) : 0
  if (spend < limiarRuido(cpaAlvo)) {
    return mk('cedo', `gasto ainda baixo (${fmtBRL(spend)}) pra julgar o criativo`, '')
  }

  
  if (isVideo && hook !== undefined && hook < hookFraco) {
    return mk('hook',
      `o vídeo não para o scroll (hook ${pct(hook)}, abaixo dos ${pct(hookFraco)} de par)`,
      'troque os primeiros 3s / thumbnail — é o topo do funil de atenção')
  }
  
  if (isVideo && (hook === undefined || hook >= hookFraco) && hold !== undefined && hold < HOLD_FRACO) {
    return mk('hold',
      `prende no início${hook !== undefined ? ` (hook ${pct(hook)})` : ''} mas perde no meio (hold ${pct(hold)})`,
      'refaça o corpo 3–10s / ritmo — NÃO é a oferta')
  }
  
  if (ctrFraco(m.ctr, faixaDe(baseline, 'ctr'), benchCtrFaixa)) {
    return mk('ctr_cta',
      `chama atenção mas o clique não vem (CTR ${m.ctr !== undefined ? pct(m.ctr) : '—'} abaixo do normal)`,
      'ajuste CTA/promessa/oferta no anúncio — não o formato')
  }
  
  const cpaRuim = cpaAlto(m.cpa, faixaDe(baseline, 'cpa'))
  const roasRuim = roasBaixo(m.roas, faixaDe(baseline, 'roas'))
  if (cpaRuim || roasRuim) {
    const qual = cpaRuim ? 'CPA acima do normal' : 'ROAS abaixo do normal'
    return {
      ...mk('downstream',
        `o criativo faz o trabalho (hook/hold/CTR ok) mas a venda não fecha (${qual})`,
        'não refaça a arte; o gargalo é depois do clique'),
      teste: construirTesteDownstream(m, input.frame),
    }
  }
  
  const nivel = hook !== undefined && hook >= hookEscala ? ' (hook em nível de escala)' : ''
  return mk('saudavel', `dentro/acima do normal da conta em todos os degraus${nivel}`, 'mantenha/escale')
}

export function diagnosticarCriativos(inputs: DiagCriativoInput[]): DiagCriativo[] {
  return inputs.map(diagnosticarCriativo)
}

const ACIONAVEIS: ReadonlySet<CausaCriativo> = new Set(['hook', 'hold', 'ctr_cta', 'downstream'])


export function construirTesteDownstream(m: MetricShape, frame?: FrameConta): string {
  const kpi =
    frame?.metricaPrimaria === 'cpa' ? 'CPL'
    : frame?.metricaPrimaria === 'roas' ? 'CPA e o ROAS'
    : 'custo por resultado'
  const freq = m.frequency
  if (freq !== undefined && freq >= FREQ_SATURACAO) {
    return `o mesmo público já viu demais (frequência ${freq.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}). Rode 1 adset novo de público amplo mais Advantage+ Audience contra o público atual por 4 a 7 dias e compare o ${kpi}.`
  }
  switch (frame?.arquetipo) {
    case 'ecommerce':
      return 'o clique vem mas a compra não fecha (o gargalo é pós-clique, não a arte). Teste a página e o checkout (velocidade, prova social, oferta/frete) mudando um elemento por vez, por 4 a 7 dias.'
    case 'infoproduto':
      return 'o clique vem e a venda não fecha. Teste a OFERTA (bônus, garantia, parcelamento) e a página de vendas com o MESMO criativo, por 4 a 7 dias.'
    case 'lead-gen':
    case 'servico-local':
      return 'o clique vem mas o lead não. Teste o formulário e a página (menos campos, promessa mais clara), ou instant form contra a LP, por 4 a 7 dias.'
    default:
      return 'o clique vem mas a conversão não. O gargalo é pós-clique (página, oferta ou checkout), não o criativo. Isole testando um elemento por vez por 4 a 7 dias.'
  }
}


export function resumoCriativo(diags: DiagCriativo[]): string {
  const acionaveis = diags.filter((d) => ACIONAVEIS.has(d.causa))
  if (!acionaveis.length) return ''
  const linhas = acionaveis.map((d) => `- ${d.nome} [${d.id}]: ${d.diagnostico} → ${d.acao}${d.teste ? ` · Próximo teste: ${d.teste}` : ''}`)
  return `\n\nDiagnóstico de criativo (a CAUSA por anúncio):\n${linhas.join('\n')}`
}
