
import type { MetricShape } from '@/lib/trafego/types'
import { avaliarVsNormal, type AccountBaseline } from '@/lib/trafego/baseline'
import { faixaDeBenchmark, type FaixaBenchmark } from '@/lib/trafego/benchmarks'
import { CONV_MIN_VEREDITO, ehTendenciaSustentada, type Sinal } from '@/lib/trafego/sinais'
import type { FrameConta } from '@/lib/trafego/perfilConta'

export type Veredito = 'escalar' | 'cortar' | 'observar' | 'aprendendo'

const GASTO_RELEVANTE = 1
const ROAS_CORTE_FIXO = 1
const ROAS_ESCALA_FIXO = 2

export const GASTO_MIN_BENCHMARK = 300


const NEGATIVO_FORTE: ReadonlySet<Sinal['tipo']> = new Set(['roas_baixo', 'roas_caindo', 'cpa_alto'])

const SATURACAO: ReadonlySet<Sinal['tipo']> = new Set(['fadiga', 'frequencia_alta', 'cpm_subindo'])


function vereditoBase(
  m: MetricShape,
  baseline: AccountBaseline | null,
  learning?: string,
  frame?: FrameConta,
  benchmarkKpi?: FaixaBenchmark,
): Veredito {
  if (learning === 'LEARNING') return 'aprendendo'
  const bloqueiaEscala = learning === 'LEARNING_LIMITED' || learning === 'FAIL'
  const emLearning = learning === 'LEARNING' || learning === 'LEARNING_LIMITED' || learning === 'FAIL'

  
  function vereditoBenchmark(valor: number, faixaBm: FaixaBenchmark, menorMelhor: boolean): Veredito {
    
    
    if (emLearning || (m.spend ?? 0) < GASTO_MIN_BENCHMARK) return 'observar'
    const { posicao } = avaliarVsNormal(valor, faixaDeBenchmark(faixaBm))
    if (menorMelhor) {
      
      if (posicao === 'abaixo') return 'escalar'
      if (posicao === 'acima') return 'cortar'
      return 'observar'
    }
    
    if (posicao === 'acima') return 'escalar'
    if (posicao === 'abaixo') return 'cortar'
    return 'observar'
  }

  
  if (frame?.metricaPrimaria === 'cpa') {
    const cpa = m.cpa
    if (cpa === undefined || (m.spend ?? 0) < GASTO_RELEVANTE) return 'observar'
    const faixa = baseline?.suficiente ? baseline.faixas.cpa : undefined
    if (faixa) {
      const { posicao } = avaliarVsNormal(cpa, faixa)
      if (posicao === 'abaixo' && !bloqueiaEscala) return 'escalar' 
      if (posicao === 'acima') return 'cortar'                       
      return 'observar'
    }
    if (frame.alvo !== undefined && frame.alvo > 0) {
      if (cpa <= frame.alvo && !bloqueiaEscala) return 'escalar'
      if (cpa > frame.alvo) return 'cortar'
      return 'observar'
    }
    
    if (benchmarkKpi) return vereditoBenchmark(cpa, benchmarkKpi, true)
    return 'observar' 
  }

  
  const roas = m.roas
  if (roas === undefined || (m.spend ?? 0) < GASTO_RELEVANTE) return 'observar'
  const faixa = baseline?.suficiente ? baseline.faixas.roas : undefined
  if (faixa) {
    const { posicao } = avaliarVsNormal(roas, faixa)
    if (posicao === 'acima' && !bloqueiaEscala) return 'escalar'
    if (posicao === 'abaixo') return 'cortar'
    return 'observar'
  }
  
  if (benchmarkKpi) return vereditoBenchmark(roas, benchmarkKpi, false)
  if (roas < ROAS_CORTE_FIXO) return 'cortar'
  if (roas >= ROAS_ESCALA_FIXO && !bloqueiaEscala) return 'escalar'
  return 'observar'
}


export function vereditoDe(
  m: MetricShape,
  baseline: AccountBaseline | null,
  opts: { learning?: string; sinais?: Sinal[]; frame?: FrameConta; benchmarkKpi?: FaixaBenchmark } = {},
): Veredito {
  const base = vereditoBase(m, baseline, opts.learning, opts.frame, opts.benchmarkKpi)
  let v = base
  if (opts.sinais && base !== 'aprendendo') {
    const sinais = opts.sinais
    if (sinais.some((s) => s.severidade === 'alta' && NEGATIVO_FORTE.has(s.tipo))) v = 'cortar'
    else if (base === 'escalar' && sinais.some((s) => SATURACAO.has(s.tipo))) v = 'observar'
  }

  
  
  
  
  if ((v === 'escalar' || v === 'cortar')
      && m.conversions !== undefined && m.conversions < CONV_MIN_VEREDITO) {
    
    
    const corteSustentado = v === 'cortar' && ehTendenciaSustentada(opts.sinais)
    if (!corteSustentado) v = 'observar'
  }
  return v
}


export function motivoDe(sinais: Sinal[]): string {
  return sinais.slice(0, 2).map((s) => s.texto).join('; ')
}
