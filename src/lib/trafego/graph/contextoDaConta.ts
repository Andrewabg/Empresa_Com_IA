


import { campoSeguro } from '@/lib/fontes/sanitizar'
import { ARQUETIPO_LABEL, inferirFrame, resolverFrame, type FrameConta, type PerfilContaSalvo } from '@/lib/trafego/perfilConta'
import type { FaixaNormal } from '@/lib/trafego/baseline'
import { GUARDA_DO_CONTEXTO } from './mensagens'

const LINHAS_DA_FICHA = 5
const LINHAS_DE_MUDANCAS = 5


export function frameDaConta(salvo: PerfilContaSalvo | undefined): FrameConta {
  return resolverFrame(salvo, inferirFrame({ optimizationGoals: [], temPurchase: true }))
}

function num(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',')
}


export function linhasSegurasDaFicha(ficha: string): string[] {
  return ficha.split('\n').map((l) => campoSeguro(l)).filter(Boolean)
}

export function renderContextoDaConta(i: { frame: FrameConta; faixas: FaixaNormal[]; ficha: string; mudancas: string }): string {
  const f = i.frame
  const regua = f.metricaPrimaria === 'roas' ? 'julgada por ROAS' : 'julgada por custo por conversão'
  const origem = f.origem === 'declarado' ? 'declarado pelo dono' : 'inferido, sem declaração do dono'
  const linhas = [`Tipo da conta: ${ARQUETIPO_LABEL[f.arquetipo]}, ${regua} (${origem})${f.alvo !== undefined ? `, alvo ${num(f.alvo)}` : ''}.`]
  if (i.faixas.length) linhas.push(`Faixa normal da conta (p25 a p75): ${i.faixas.map((x) => `${x.metric} ${num(x.p25)} a ${num(x.p75)} (${x.n} dias)`).join('; ')}.`)
  else linhas.push('Faixa normal da conta: ainda sem histórico suficiente.')
  const ficha = linhasSegurasDaFicha(i.ficha).slice(0, LINHAS_DA_FICHA)
  if (ficha.length) linhas.push('Da Ficha da conta:', ...ficha)
  const mud = i.mudancas.split('\n').map((l) => campoSeguro(l)).filter(Boolean).slice(0, LINHAS_DE_MUDANCAS)
  if (mud.length) linhas.push('Mudanças recentes:', ...mud)
  return `${GUARDA_DO_CONTEXTO}\n«conta»\n${linhas.map((l) => campoSeguro(l)).join('\n')}\n«/conta»`
}
