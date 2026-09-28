




import { fmtBRL, fmtPct } from '@/lib/trafego/format'
import { funnelLabel } from '@/lib/trafego/funnelLabels'
import { dropoffFunil } from '@/lib/trafego/diagnostico'
import type { Entidade } from '@/lib/trafego/relatorio'

const fmtCount = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
const fmtRoasMult = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + 'x'
const fmtFreq = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })


export interface Vazamento {
  origemKey: string
  destinoKey: string
  origem: string
  destino: string
  
  retencao: number
  
  queda: number
}


export function derivarVazamento(funnel: Record<string, number>): Vazamento | null {
  const drop = dropoffFunil(funnel)
  if (!drop) return null
  const keys = Object.keys(funnel)
  const idx = keys.indexOf(drop.etapa)
  const origemKey = idx > 0 ? keys[idx - 1] : null
  if (!origemKey || !(funnel[origemKey] > 0)) return null
  return {
    origemKey,
    destinoKey: drop.etapa,
    origem: funnelLabel(origemKey),
    destino: funnelLabel(drop.etapa),
    retencao: funnel[drop.etapa] / funnel[origemKey],
    queda: drop.queda,
  }
}


export function groundFunil(funnel: Record<string, number>): string {
  const keys = Object.keys(funnel)
  if (keys.length < 2) return ''

  const linhas: string[] = ['Funil (do topo ao fundo, números crus):']
  for (let i = 0; i < keys.length; i++) {
    const label = funnelLabel(keys[i])
    const count = funnel[keys[i]]
    if (i === 0) {
      linhas.push(`- ${label}: ${fmtCount(count)}`)
    } else {
      const anterior = funnel[keys[i - 1]]
      const pct = anterior > 0 ? ` (${fmtPct(count / anterior)} da etapa anterior)` : ''
      linhas.push(`- ${label}: ${fmtCount(count)}${pct}`)
    }
  }

  const vaz = derivarVazamento(funnel)
  if (vaz) {
    linhas.push(
      `MAIOR VAZAMENTO: ${vaz.origem} → ${vaz.destino} — só ${fmtPct(vaz.retencao)} avançam de "${vaz.origem}" ` +
        `para "${vaz.destino}" (${fmtPct(vaz.queda)} somem ANTES de chegar à etapa ${vaz.destino}).`,
    )
    
    const idx = keys.indexOf(vaz.destinoKey)
    const proxKey = keys[idx + 1]
    if (proxKey && funnel[vaz.destinoKey] > 0) {
      const prox = funnelLabel(proxKey)
      const retProx = funnel[proxKey] / funnel[vaz.destinoKey]
      linhas.push(
        `Leia como: "X% de [etapa anterior] avançaram para [etapa]". Dos que CHEGAM a ` +
          `"${vaz.destino}", ${fmtPct(retProx)} avançam para "${prox}".`,
      )
    }
  }
  return linhas.join('\n')
}


export const LIMIAR_ANOMALIA = 0.05


const ORIGENS_POS_CLIQUE = new Set([
  'link_click', 'landing_page_view', 'add_to_cart', 'initiate_checkout', 'add_payment_info',
])


export function notaAnomaliaFunil(funnel: Record<string, number>): string {
  const vaz = derivarVazamento(funnel)
  if (!vaz) return ''
  if (!ORIGENS_POS_CLIQUE.has(vaz.origemKey)) return ''
  if (vaz.retencao >= LIMIAR_ANOMALIA) return ''
  return (
    `⚠ Atenção ao dado: só ${fmtPct(vaz.retencao)} avançam de "${vaz.origem}" para "${vaz.destino}" — ` +
    `anormalmente baixo. Pode ser vazamento real de página OU o pixel de "${vaz.destino}" ` +
    `subnotificando esse evento. Valide o rastreamento antes de recomendar gasto em cima dessa etapa.`
  )
}


export function vazamentoCurto(funnel: Record<string, number>): string {
  const vaz = derivarVazamento(funnel)
  if (!vaz) return ''
  return `${vaz.origem}→${vaz.destino} (só ${fmtPct(vaz.retencao)} avançam)`
}


export function groundCampanhas(camps: Entidade[], periodoDias: number): string {
  if (!camps.length) return ''
  const ordenadas = [...camps].sort((a, b) => (b.m.spend ?? 0) - (a.m.spend ?? 0))
  const linhas = ordenadas.map((c) => {
    const nome = c.name ?? '(sem nome)'
    const frags: string[] = []
    if (c.m.spend !== undefined) {
      const perDia = periodoDias >= 1 ? ` (${fmtBRL(c.m.spend / periodoDias)}/dia)` : ''
      frags.push(`gasto ${fmtBRL(c.m.spend)}${perDia}`)
    }
    if (c.m.roas !== undefined) frags.push(`ROAS ${fmtRoasMult(c.m.roas)}`)
    if (c.m.frequency !== undefined) frags.push(`freq ${fmtFreq(c.m.frequency)}`)
    const tail = frags.length ? ` — ${frags.join(', ')}` : ''
    return `- ${nome} [${c.id}]${tail}`
  })
  const dias = `${periodoDias} ${periodoDias === 1 ? 'dia' : 'dias'}`
  return `Campanhas (por gasto, período de ${dias}):\n${linhas.join('\n')}`
}
