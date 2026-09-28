

import type { HiringBrief, FerramentaStatus, HiringMode } from './brief'

export type HiringTopic = 'missao' | 'ferramentas' | 'fronteiras'
export interface HiringCoverage { covered: HiringTopic[]; missing: HiringTopic[]; done: boolean }


const FINAL: Set<FerramentaStatus> = new Set(['conectada', 'pendente', 'indisponivel'])



export function hiringCoverage(brief: HiringBrief, mode: HiringMode = 'criacao'): HiringCoverage {
  const covered: HiringTopic[] = []
  const missing: HiringTopic[] = []
  const temMissao = mode === 'revisao'
    ? !!(brief.papel?.trim() && brief.missao?.trim())
    : !!(brief.papel?.trim() && brief.missao?.trim() && brief.resultado?.trim())
  ;(temMissao ? covered : missing).push('missao')
  const temFerr = brief.semFerramentas === true || brief.ferramentas.some((f) => FINAL.has(f.status))
  ;(temFerr ? covered : missing).push('ferramentas')
  const temFront = brief.fronteirasPadrao === true || brief.fronteiras.length > 0
  ;(temFront ? covered : missing).push('fronteiras')
  return { covered, missing, done: missing.length === 0 }
}
