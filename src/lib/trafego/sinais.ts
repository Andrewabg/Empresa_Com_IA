


import type { MetricShape } from '@/lib/trafego/types'
import { avaliarVsNormal, tendencia, type AccountBaseline, type DiaSerie } from '@/lib/trafego/baseline'
import { detectarFadiga } from '@/lib/trafego/diagnostico'
import type { FrameConta } from '@/lib/trafego/perfilConta'
import { fmtBRL } from '@/lib/trafego/format'

export type SinalTipo =
  | 'roas_baixo' | 'roas_caindo' | 'cpa_alto' | 'cpa_subindo'
  | 'fadiga' | 'frequencia_alta' | 'cpm_subindo'
  | 'ctr_baixo' | 'ctr_caindo' | 'hook_fraco' | 'hold_fraco'
  | 'volume_baixo' | 'aprendizado'
  | 'gasto_concentrado' | 'vazamento_funil'
export type Severidade = 'alta' | 'media' | 'baixa'
export interface Sinal { tipo: SinalTipo; severidade: Severidade; texto: string; metrica?: string }

export interface SinaisInput {
  m: MetricShape
  serie?: DiaSerie[]
  baseline?: AccountBaseline | null
  learning?: string
  frame?: FrameConta
}

const GASTO_RELEVANTE = 1

export const CONV_MIN_VEREDITO = 15


const TENDENCIA_SUSTENTADA: ReadonlySet<string> = new Set(['roas_caindo', 'cpa_subindo'])


export function ehTendenciaSustentada(sinais?: ReadonlyArray<{ tipo: string }>): boolean {
  return !!sinais?.some((s) => TENDENCIA_SUSTENTADA.has(s.tipo))
}
const FREQ_ALTA = 3
const HOOK_FRACO = 0.25
const HOLD_FRACO = 0.05
const CTR_BAIXO = 0.01
const ROAS_BAIXO_FIXO = 1
const DIAS_TENDENCIA = 2 

const ORDEM: Record<Severidade, number> = { alta: 0, media: 1, baixa: 2 }


export function diagnosticar(input: SinaisInput): Sinal[] {
  const { m, baseline, learning } = input
  const serie = input.serie ?? []
  const ms = serie.map((d) => d.m) 
  const suf = baseline?.suficiente ? baseline : null
  const out: Sinal[] = []

  
  if (learning === 'LEARNING' || learning === 'LEARNING_LIMITED') out.push({ tipo: 'aprendizado', severidade: 'media', texto: 'Em aprendizado — não escalar ainda' })
  if ((m.conversions ?? 0) < CONV_MIN_VEREDITO && (m.spend ?? 0) >= GASTO_RELEVANTE) out.push({ tipo: 'volume_baixo', severidade: 'baixa', texto: `Amostra insuficiente (${m.conversions ?? 0} conv) — pouca base pra cravar escalar/cortar` })

  const modoCpa = input.frame?.metricaPrimaria === 'cpa'

  
  if (!modoCpa && m.roas !== undefined && (m.spend ?? 0) >= GASTO_RELEVANTE) {
    const faixa = suf?.faixas.roas
    const baixo = faixa ? avaliarVsNormal(m.roas, faixa).posicao === 'abaixo' : m.roas < ROAS_BAIXO_FIXO
    if (baixo) out.push({ tipo: 'roas_baixo', severidade: 'alta', texto: `ROAS abaixo do normal (${m.roas.toFixed(2)}x)`, metrica: 'roas' })
    const t = tendencia(serie, 'roas')
    if (t && t.direcao === 'caindo' && t.diasSeguidos >= DIAS_TENDENCIA) out.push({ tipo: 'roas_caindo', severidade: 'alta', texto: `ROAS caindo há ${t.diasSeguidos} dias`, metrica: 'roas' })
  }

  
  if (modoCpa && m.cpa !== undefined && (m.spend ?? 0) >= GASTO_RELEVANTE) {
    const faixa = suf?.faixas.cpa
    const alvo = input.frame?.alvo
    const alto = faixa
      ? avaliarVsNormal(m.cpa, faixa).posicao === 'acima'
      : (alvo !== undefined && alvo > 0 ? m.cpa > alvo : false)
    if (alto) out.push({ tipo: 'cpa_alto', severidade: 'alta', texto: `CPL acima do ${faixa ? 'normal' : 'alvo'} (${fmtBRL(m.cpa)})`, metrica: 'cpa' })
  }

  const tcpa = tendencia(serie, 'cpa')
  if (tcpa && tcpa.direcao === 'subindo' && tcpa.diasSeguidos >= DIAS_TENDENCIA) out.push({ tipo: 'cpa_subindo', severidade: 'media', texto: `CPA subindo há ${tcpa.diasSeguidos} dias`, metrica: 'cpa' })

  
  if (detectarFadiga(ms)) out.push({ tipo: 'fadiga', severidade: 'alta', texto: 'Fadiga de criativo (frequência subindo, CTR caindo)', metrica: 'frequency' })
  if ((m.frequency ?? 0) >= FREQ_ALTA) out.push({ tipo: 'frequencia_alta', severidade: 'media', texto: `Frequência alta (${(m.frequency as number).toFixed(1)})`, metrica: 'frequency' })
  const tcpm = tendencia(serie, 'cpm')
  if (tcpm && tcpm.direcao === 'subindo' && tcpm.diasSeguidos >= DIAS_TENDENCIA) out.push({ tipo: 'cpm_subindo', severidade: 'media', texto: `CPM subindo há ${tcpm.diasSeguidos} dias (leilão/público saturando)`, metrica: 'cpm' })

  
  if (m.ctr !== undefined && m.ctr <= CTR_BAIXO) out.push({ tipo: 'ctr_baixo', severidade: 'media', texto: `CTR baixo (${(m.ctr * 100).toFixed(2)}%)`, metrica: 'ctr' })
  const tctr = tendencia(serie, 'ctr')
  if (tctr && tctr.direcao === 'caindo' && tctr.diasSeguidos >= DIAS_TENDENCIA) out.push({ tipo: 'ctr_caindo', severidade: 'baixa', texto: `CTR caindo há ${tctr.diasSeguidos} dias`, metrica: 'ctr' })
  const hook = m.video?.hook_rate
  if (hook !== undefined && hook < HOOK_FRACO) out.push({ tipo: 'hook_fraco', severidade: 'baixa', texto: `Hook fraco (${(hook * 100).toFixed(0)}%)` })
  const hold = m.video?.hold_rate
  if (hold !== undefined && hold < HOLD_FRACO) out.push({ tipo: 'hold_fraco', severidade: 'baixa', texto: `Retenção fraca (${(hold * 100).toFixed(0)}%)` })

  return out.sort((a, b) => ORDEM[a.severidade] - ORDEM[b.severidade])
}


export function sinalPrincipal(sinais: Sinal[]): Sinal | undefined {
  return sinais[0]
}
