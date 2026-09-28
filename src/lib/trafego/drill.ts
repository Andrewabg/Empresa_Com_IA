
import type { MetricShape } from '@/lib/trafego/types'
import type { AccountBaseline, DiaSerie } from '@/lib/trafego/baseline'
import { diagnosticar, type Sinal } from '@/lib/trafego/sinais'
import { vereditoDe, motivoDe, type Veredito } from '@/lib/trafego/veredito'
import type { FrameConta } from '@/lib/trafego/perfilConta'
import type { BenchmarkNicho } from '@/lib/trafego/benchmarks'
import type { CampaignEntity } from '@/lib/trafego/normalize'

export interface EntidadeDrill {
  id: string
  nome: string | null
  m: MetricShape
  parentIds?: { campaignId?: string; adsetId?: string }
  learning?: string
  
  entity?: CampaignEntity
}
export interface NoAnuncio { id: string; nome: string; m: MetricShape; veredito: Veredito; sinais?: Sinal[]; motivo?: string }
export interface NoConjunto {
  id: string; nome: string; m: MetricShape; learning?: string; veredito: Veredito; anuncios: NoAnuncio[]; sinais?: Sinal[]; motivo?: string
}
export interface NoCampanha { id: string; nome: string; m: MetricShape; veredito: Veredito; conjuntos: NoConjunto[]; sinais?: Sinal[]; motivo?: string; entity?: CampaignEntity }

function push<K, V>(map: Map<K, V[]>, key: K, val: V) {
  const arr = map.get(key)
  if (arr) arr.push(val)
  else map.set(key, [val])
}


const CONCENTRACAO_GASTO = 0.7


export function montarArvore(
  campanhas: EntidadeDrill[],
  conjuntos: EntidadeDrill[],
  anuncios: EntidadeDrill[],
  baseline: AccountBaseline | null,
  seriePorId?: Record<string, DiaSerie[]>,
  frame?: FrameConta,
  benchmark?: BenchmarkNicho | null,
): NoCampanha[] {
  const adsPorConj = new Map<string, NoAnuncio[]>()
  for (const a of anuncios) {
    const sid = a.parentIds?.adsetId
    if (!sid) continue
    const s = diagnosticar({ m: a.m, serie: seriePorId?.[a.id], baseline, learning: a.learning, frame })
    push(adsPorConj, sid, {
      id: a.id,
      nome: a.nome ?? '(sem nome)',
      m: a.m,
      veredito: vereditoDe(a.m, baseline, { learning: a.learning, sinais: s, frame, benchmarkKpi: benchmark?.kpi }),
      sinais: s,
      motivo: motivoDe(s),
    })
  }
  const conjPorCamp = new Map<string, NoConjunto[]>()
  for (const c of conjuntos) {
    const cid = c.parentIds?.campaignId
    if (!cid) continue
    const s = diagnosticar({ m: c.m, serie: seriePorId?.[c.id], baseline, learning: c.learning, frame })
    push(conjPorCamp, cid, {
      id: c.id,
      nome: c.nome ?? '(sem nome)',
      m: c.m,
      learning: c.learning,
      veredito: vereditoDe(c.m, baseline, { learning: c.learning, sinais: s, frame, benchmarkKpi: benchmark?.kpi }),
      anuncios: adsPorConj.get(c.id) ?? [],
      sinais: s,
      motivo: motivoDe(s),
    })
  }
  return campanhas.map((camp) => {
    const conjs = conjPorCamp.get(camp.id) ?? []
    const s = diagnosticar({ m: camp.m, serie: seriePorId?.[camp.id], baseline, learning: camp.learning, frame })
    
    const campSpend = camp.m.spend ?? 0
    if (conjs.length >= 2 && campSpend > 0) {
      const maxConj = Math.max(...conjs.map((c) => c.m.spend ?? 0))
      if (maxConj > CONCENTRACAO_GASTO * campSpend) {
        s.push({ tipo: 'gasto_concentrado', severidade: 'media', texto: 'Gasto concentrado num conjunto' })
      }
    }
    return {
      id: camp.id,
      nome: camp.nome ?? '(sem nome)',
      m: camp.m,
      veredito: vereditoDe(camp.m, baseline, { learning: camp.learning, sinais: s, frame, benchmarkKpi: benchmark?.kpi }),
      conjuntos: conjs,
      sinais: s,
      motivo: motivoDe(s),
      
      ...(camp.entity ? { entity: camp.entity } : {}),
    }
  })
}

const PESO: Record<Veredito, number> = { cortar: 3, escalar: 2, aprendendo: 1, observar: 1 }


export function selecionarAutoDrill(campanhas: NoCampanha[], cap = 3): NoCampanha[] {
  const score = (c: NoCampanha) => PESO[c.veredito] * 1e12 + (c.m.spend ?? 0)
  return [...campanhas].sort((a, b) => score(b) - score(a)).slice(0, cap)
}


export const ADS_POR_CONJ = 4


export function drilldownConfig(camp: NoCampanha, accountId: string): Record<string, unknown> {
  return {
    accountId,
    campanha: { id: camp.id, nome: camp.nome, spend: camp.m.spend, roas: camp.m.roas, veredito: camp.veredito, motivo: camp.motivo },
    conjuntos: camp.conjuntos.map((c) => ({
      id: c.id, nome: c.nome, spend: c.m.spend, roas: c.m.roas, veredito: c.veredito, learning: c.learning, motivo: c.motivo,
      anuncios: [...c.anuncios]
        .sort((a, b) => (b.m.roas ?? -Infinity) - (a.m.roas ?? -Infinity))
        .slice(0, ADS_POR_CONJ)
        .map((a) => ({ id: a.id, nome: a.nome, spend: a.m.spend, roas: a.m.roas, cpa: a.m.cpa, ctr: a.m.ctr, hookRate: a.m.video?.hook_rate, veredito: a.veredito, motivo: a.motivo })),
    })),
  }
}
