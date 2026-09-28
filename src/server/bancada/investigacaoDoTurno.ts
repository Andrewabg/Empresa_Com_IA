


import { getTurnContext } from '@/server/agent/turnContext'
import { AVISO_CHAMADAS_HTTP, TETO_CHAMADAS_HTTP, TETO_DE_CALCULOS } from '@/lib/trafego/graph/tipos'
import { ledgerVazio, ledgerVazioDeTrabalho, renderBlocoDaInvestigacao, type Ledger } from '@/lib/trafego/graph/ledger'
import { headerDoFechamentoDaInvestigacao, type GatilhoDoFechamento } from '@/lib/conversa/fechamentoDoTurno'
import type { Investigacao } from '@/lib/trafego/graph/investigacao'

export function obterInvestigacao(): Investigacao {
  const ctx = getTurnContext()
  if (!ctx.investigacao) ctx.investigacao = { chamadasHttp: 0, avisouChamadas: false, contextoEntregue: false, ledger: ledgerVazio() }
  return ctx.investigacao
}


export function blocoDaInvestigacaoParaFechamento(
  ledger: Ledger | undefined,
  gatilho: GatilhoDoFechamento = 'prazo',
): { header: string; bloco: string } | undefined {
  if (!ledger || ledgerVazioDeTrabalho(ledger)) return undefined
  return { header: headerDoFechamentoDaInvestigacao(gatilho), bloco: renderBlocoDaInvestigacao(ledger) }
}

export function reservarChamada(inv: Investigacao): { ok: true; numero: number; avisar: boolean } | { ok: false } {
  if (inv.chamadasHttp >= TETO_CHAMADAS_HTTP) return { ok: false }
  inv.chamadasHttp += 1
  const avisar = inv.chamadasHttp >= AVISO_CHAMADAS_HTTP && !inv.avisouChamadas
  if (avisar) inv.avisouChamadas = true
  return { ok: true, numero: inv.chamadasHttp, avisar }
}


export function reservarCalculo(inv: Investigacao): boolean {
  const feitos = inv.calculos ?? 0
  if (feitos >= TETO_DE_CALCULOS) return false
  inv.calculos = feitos + 1
  return true
}
