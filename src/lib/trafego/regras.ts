




import type { AccountBaseline } from '@/lib/trafego/baseline'
import type { NoCampanha, NoConjunto } from '@/lib/trafego/drill'
import type { LeituraConta } from '@/lib/trafego/leituraConta'
import { DOW_LABEL } from '@/lib/trafego/leituraConta'
import { diagnosticarCriativo, type DiagCriativo } from '@/lib/trafego/criativo'
import { classificarPostura, concentracaoCriativa, adviceConsolidar, adviceDiversificar } from '@/lib/trafego/andromeda'
import type { SinalTipo } from '@/lib/trafego/sinais'
import { fmtBRL } from '@/lib/trafego/format'
import type { FrameConta } from '@/lib/trafego/perfilConta'
import type { BenchmarkNicho } from '@/lib/trafego/benchmarks'
import type { MetricShape } from '@/lib/trafego/types'


export const ESCALA_DELTA_PCT = 20   
export const FRAG_MIN_CONJUNTOS = 3  
export const FRAG_MIN_FAMINTOS = 2   


const LEARNING_FAMINTOS: ReadonlySet<string> = new Set(['LEARNING_LIMITED', 'FAIL'])


const CAUSAS_CRIATIVO: ReadonlySet<string> = new Set(['hook', 'hold', 'ctr_cta'])

const fmtRoasMult = (n: number): string => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + 'x'

function metricaCampanha(m: MetricShape, frame?: FrameConta): string {
  if (frame?.metricaPrimaria === 'cpa') {
    return m.cpa !== undefined ? `CPL ${fmtBRL(m.cpa)}` : 'CPL —'
  }
  return m.roas !== undefined ? `ROAS ${fmtRoasMult(m.roas)}` : 'ROAS —'
}

export type TipoAcao = 'escalar' | 'cortar' | 'consolidar' | 'trocar_criativo' | 'diversificar_criativo' | 'testar_gargalo' | 'manter' | 'saude'

export interface Acao {
  tipo: TipoAcao
  entityId: string
  nome: string
  level: 'campaign'
  
  delta?: string
  
  porque: string
  
  prioridade: number
}

export interface RegrasCtx {
  baseline: AccountBaseline
  
  leitura?: LeituraConta
  cpaAlvo?: number
  
  frame?: FrameConta
  
  benchmark?: BenchmarkNicho | null
  
  campanhasAfetadas?: Set<string>
}


export function contarFamintos(conjuntos: NoConjunto[]): number {
  return conjuntos.filter((c) => c.learning !== undefined && LEARNING_FAMINTOS.has(c.learning)).length
}


export function fragmentacaoExcessiva(conjuntos: NoConjunto[]): boolean {
  return conjuntos.length >= FRAG_MIN_CONJUNTOS && contarFamintos(conjuntos) >= FRAG_MIN_FAMINTOS
}


const FADIGA_TIPOS: ReadonlySet<SinalTipo> = new Set(['fadiga', 'roas_caindo', 'cpa_subindo', 'frequencia_alta'])
function vencedorEmFadiga(camp: NoCampanha): boolean {
  return (camp.sinais ?? []).some((s) => FADIGA_TIPOS.has(s.tipo))
}


function anuncioComCriativoRuim(camp: NoCampanha, ctx: RegrasCtx): { nome: string; diagnostico: string } | undefined {
  for (const conj of camp.conjuntos) {
    for (const ad of conj.anuncios) {
      const d = diagnosticarCriativo({ id: ad.id, nome: ad.nome, m: ad.m, baseline: ctx.baseline, cpaAlvo: ctx.cpaAlvo, ...(ctx.frame ? { frame: ctx.frame } : {}), ...(ctx.benchmark ? { benchmark: ctx.benchmark } : {}) })
      if (CAUSAS_CRIATIVO.has(d.causa)) return { nome: ad.nome, diagnostico: d.diagnostico }
    }
  }
  return undefined
}


function campanhaComDownstream(camp: NoCampanha, ctx: RegrasCtx): DiagCriativo | undefined {
  for (const conj of camp.conjuntos) {
    for (const ad of conj.anuncios) {
      const d = diagnosticarCriativo({ id: ad.id, nome: ad.nome, m: ad.m, baseline: ctx.baseline, cpaAlvo: ctx.cpaAlvo, ...(ctx.frame ? { frame: ctx.frame } : {}), ...(ctx.benchmark ? { benchmark: ctx.benchmark } : {}) })
      if (d.causa === 'downstream') return d
    }
  }
  return undefined
}


export function avaliarAcaoCampanha(camp: NoCampanha, ctx: RegrasCtx): Acao {
  const base = { entityId: camp.id, nome: camp.nome, level: 'campaign' as const }
  const spend = camp.m.spend ?? 0

  if (ctx.campanhasAfetadas?.has(camp.id)) {
    return { ...base, tipo: 'saude', prioridade: 3,
      porque: 'anúncio reprovado nesta campanha — resolva a reprovação no Gerenciador antes de escalar; a verba não roda normalmente.' }
  }
  if (camp.veredito === 'cortar') {
    return { ...base, tipo: 'cortar', prioridade: 3,
      porque: `${metricaCampanha(camp.m, ctx.frame)} ${ctx.frame?.metricaPrimaria === 'cpa' ? 'acima do alvo/normal' : 'abaixo do normal'}, gasto ${fmtBRL(spend)} sem retorno — pausar ou realocar.` }
  }
  if (fragmentacaoExcessiva(camp.conjuntos)) {
    const n = camp.conjuntos.length
    const mF = contarFamintos(camp.conjuntos)
    return { ...base, tipo: 'consolidar', prioridade: 2,
      porque: adviceConsolidar(n, mF, classificarPostura(camp.entity)) }
  }
  
  
  if (camp.veredito === 'observar') {
    const ads = camp.conjuntos.flatMap((c) => c.anuncios)
    if (concentracaoCriativa(ads).concentrado && vencedorEmFadiga(camp)) {
      return { ...base, tipo: 'diversificar_criativo', prioridade: 2, porque: adviceDiversificar(ads.length) }
    }
  }
  if (camp.veredito !== 'escalar') {
    const cr = anuncioComCriativoRuim(camp, ctx)
    if (cr) {
      return { ...base, tipo: 'trocar_criativo', prioridade: 2,
        porque: `anúncio ${cr.nome}: ${cr.diagnostico} — peça criativo novo (Téo/Lia).` }
    }
    
    const dg = campanhaComDownstream(camp, ctx)
    if (dg?.teste) {
      return { ...base, tipo: 'testar_gargalo', prioridade: 2, porque: `${dg.diagnostico}. Próximo teste: ${dg.teste}` }
    }
  }
  if (camp.veredito === 'escalar') {
    let porque = `${metricaCampanha(camp.m, ctx.frame)} ${ctx.frame?.metricaPrimaria === 'cpa' ? 'abaixo do alvo/normal' : 'acima do normal'} — escale +${ESCALA_DELTA_PCT}%.`
    if (ctx.leitura?.volatilidade === 'volatil') porque += ' (conta volátil: confirme o padrão antes)'
    if (ctx.leitura?.ritmoRoas) porque += ` (evite executar no pior dia: ${DOW_LABEL[ctx.leitura.ritmoRoas.piorDia]})`
    return { ...base, tipo: 'escalar', delta: `+${ESCALA_DELTA_PCT}%`, prioridade: 1, porque }
  }
  return { ...base, tipo: 'manter', prioridade: 0, porque: 'dentro do normal — manter e observar.' }
}


export function avaliarAcoes(campanhas: NoCampanha[], ctx: RegrasCtx): Acao[] {
  return campanhas
    .map((c) => ({ acao: avaliarAcaoCampanha(c, ctx), spend: c.m.spend ?? 0 }))
    .sort((a, b) => b.acao.prioridade - a.acao.prioridade || b.spend - a.spend)
    .map((x) => x.acao)
}

const LABEL: Record<TipoAcao, string> = {
  cortar: 'CORTAR', consolidar: 'CONSOLIDAR', trocar_criativo: 'TROCAR CRIATIVO', diversificar_criativo: 'DIVERSIFICAR CRIATIVO', testar_gargalo: 'TESTAR', escalar: 'ESCALAR', manter: 'MANTER', saude: 'RESOLVER',
}


export function resumoAcoes(acoes: Acao[]): string {
  const acionaveis = acoes.filter((a) => a.tipo !== 'manter')
  if (!acionaveis.length) return ''
  const linhas = acionaveis.map((a) => `- ${LABEL[a.tipo]} ${a.nome} [${a.entityId}]${a.delta ? ` ${a.delta}` : ''}: ${a.porque}`)
  return `\n\nPlano de ação (motor de regras):\n${linhas.join('\n')}`
}
