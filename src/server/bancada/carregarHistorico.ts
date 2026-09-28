


import { listDailySnapshots as listDailySnapshotsDefault } from '@/data/trafego'
import { computarBaseline } from '@/lib/trafego/baseline'
import { linhasDoHistorico, linhasDoNormal, serieDaConta } from '@/lib/bancada/historico'
import type { Bancada } from '@/lib/bancada/tipos'
import { fixarTabela } from './bancadaDoTurno'

export const DIAS_DE_HISTORICO = 90
export const TETO_LINHAS_DO_HISTORICO = 5_000

function shiftISO(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}


export async function carregarHistorico(
  b: Bancada,
  ctx: { operatorId?: string; hojeISO: string },
  deps: { listDailySnapshots?: typeof listDailySnapshotsDefault } = {},
): Promise<{ historico: number; cortou: boolean; normal: number }> {
  
  
  
  return (b.carregando ??= carregarDeVerdade(b, ctx, deps).catch(() => ({ historico: 0, cortou: false, normal: 0 })))
}

async function carregarDeVerdade(
  b: Bancada,
  ctx: { operatorId?: string; hojeISO: string },
  deps: { listDailySnapshots?: typeof listDailySnapshotsDefault },
): Promise<{ historico: number; cortou: boolean; normal: number }> {
  b.historicoCarregado = true
  if (!ctx.operatorId) return { historico: 0, cortou: false, normal: 0 }
  const ler = deps.listDailySnapshots ?? listDailySnapshotsDefault
  const since = shiftISO(ctx.hojeISO, -DIAS_DE_HISTORICO)
  let rows
  try {
    const [conta, campanhas] = await Promise.all([ler(ctx.operatorId, 'account', since, ctx.hojeISO), ler(ctx.operatorId, 'campaign', since, ctx.hojeISO)])
    rows = [...conta, ...campanhas]
  } catch (e) {
    console.warn('[bancada] historico indisponivel (fail-open):', e instanceof Error ? e.message : e)
    return { historico: 0, cortou: false, normal: 0 }
  }
  if (rows.length === 0) return { historico: 0, cortou: false, normal: 0 }
  const tabela = linhasDoHistorico(rows)
  const cortou = tabela.linhas.length > TETO_LINHAS_DO_HISTORICO
  if (cortou) tabela.linhas = tabela.linhas.slice(0, TETO_LINHAS_DO_HISTORICO)   
  const fix = fixarTabela(b, tabela)
  const baseline = computarBaseline(serieDaConta(rows))
  b.baseline = baseline
  const normal = linhasDoNormal(baseline)
  const fixN = normal.linhas.length ? fixarTabela(b, normal) : { ok: true as const }
  return { historico: fix.ok ? tabela.linhas.length : 0, cortou, normal: fixN.ok ? normal.linhas.length : 0 }
}
