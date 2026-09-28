



import { getApproval as getApprovalImpl, type Approval } from '@/data/approvals'
import { getAccountMemory as getMemImpl } from '@/data/accountMemory'
import { listDailySnapshots as listDailyImpl, type SnapshotRow } from '@/data/trafego'
import { insertResultadoAcao as insertImpl, type ResultadoAcaoRow } from '@/data/acaoResultados'
import { projetarAcoesDoLedger } from '@/lib/trafego/estabilizacao'
import { avaliarResultado, JANELA_ANTES_MS, GAP_LEARNING_MS, JANELA_MEDICAO_MS, type ResultadoAcao } from '@/lib/trafego/atribuicao'
import { frameDeArquetipo, type ArquetipoConta, type MetricaPrimaria } from '@/lib/trafego/perfilConta'
import type { AccountMemory } from '@/lib/trafego/accountMemory'

export interface RunAtribuicaoJobDeps {
  getApproval?: (id: string) => Promise<Approval | null>
  getAccountMemory?: (operatorId: string, accountId: string) => Promise<AccountMemory>
  listDailySnapshots?: typeof listDailyImpl
  insertResultadoAcao?: (row: ResultadoAcaoRow) => Promise<void>
  now?: () => number
}
export interface RunAtribuicaoJobResult { medido: boolean }

function isoDiaDe(ms: number): string { return new Date(ms).toISOString().slice(0, 10) }



function metricaDe(rows: SnapshotRow[], chave: MetricaPrimaria, de: string, ate: string): number | undefined {
  const vals = rows
    .filter((r) => r.period_start >= de && r.period_start <= ate)
    .map((r) => (r.metrics as Record<string, unknown>)[chave])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined
}




function somaDe(rows: SnapshotRow[], chave: string, de: string, ate: string): number | undefined {
  const vals = rows
    .filter((r) => r.period_start >= de && r.period_start <= ate)
    .map((r) => (r.metrics as Record<string, unknown>)[chave])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  return vals.length ? vals.reduce((a, b) => a + b, 0) : undefined
}

export async function runAtribuicaoJob(ref: string, deps: RunAtribuicaoJobDeps = {}): Promise<RunAtribuicaoJobResult> {
  try {
    const partes = ref.split(':')
    if (partes.length !== 4) return { medido: false }
    const [operatorId, accountId, approvalId, entityId] = partes
    if (!operatorId || !accountId || !approvalId || !entityId) return { medido: false }

    const getApproval = deps.getApproval ?? getApprovalImpl
    const getMem = deps.getAccountMemory ?? getMemImpl
    const listDaily = deps.listDailySnapshots ?? listDailyImpl
    const insert = deps.insertResultadoAcao ?? insertImpl
    const now = deps.now ?? (() => Date.now())

    const ap = await getApproval(approvalId)
    if (!ap || ap.status !== 'approved' || !ap.resolved_at) return { medido: false }
    const acaoEm = ap.resolved_at
    const acaoMs = Date.parse(acaoEm)
    
    
    if (acaoMs > now() - JANELA_MEDICAO_MS) return { medido: false }

    
    const projetadas = projetarAcoesDoLedger([{ id: approvalId, action_slug: ap.action_slug, action_args: ap.action_args, status: ap.status, created_at: ap.created_at }])
    const acao = projetadas.find((a) => a.entityId === entityId)
    if (!acao || acao.tipo !== 'orcamento') return { medido: false }
    const nivel = ap.action_slug === 'METAADS_UPDATE_CAMPAIGN' ? 'campaign' : 'adset'
    const levelSnap: SnapshotRow['level'] = nivel === 'campaign' ? 'campaign' : 'adset'

    
    const mem = await getMem(operatorId, accountId).catch(() => ({ perfil: {}, aprendizados: [] } as AccountMemory))
    const arquetipo = mem.perfil?.perfilConta?.arquetipo as ArquetipoConta | undefined

    
    const antesDe = isoDiaDe(acaoMs - JANELA_ANTES_MS)
    const antesAte = isoDiaDe(acaoMs - 86_400_000)
    const depoisDe = isoDiaDe(acaoMs + GAP_LEARNING_MS)
    const depoisAte = isoDiaDe(acaoMs + JANELA_MEDICAO_MS)

    const contaAntesRows = await listDaily(operatorId, 'account', antesDe, antesAte, accountId)
    const contaDepoisRows = await listDaily(operatorId, 'account', depoisDe, depoisAte, accountId)
    const entAntesRows = await listDaily(operatorId, levelSnap, antesDe, antesAte, entityId)
    const entDepoisRows = await listDaily(operatorId, levelSnap, depoisDe, depoisAte, entityId)

    
    let metrica: MetricaPrimaria; let direcao: 'maior_melhor' | 'menor_melhor'
    if (arquetipo) {
      const f = frameDeArquetipo(arquetipo); metrica = f.metricaPrimaria; direcao = f.direcao
    } else if (metricaDe(contaAntesRows, 'roas', antesDe, antesAte) !== undefined || metricaDe(contaDepoisRows, 'roas', depoisDe, depoisAte) !== undefined) {
      metrica = 'roas'; direcao = 'maior_melhor'
    } else {
      metrica = 'cpa'; direcao = 'menor_melhor'
    }

    const resultado: ResultadoAcao = avaliarResultado({
      metrica, direcao,
      entidadeAntes: metricaDe(entAntesRows, metrica, antesDe, antesAte), entidadeDepois: metricaDe(entDepoisRows, metrica, depoisDe, depoisAte),
      contaAntes: metricaDe(contaAntesRows, metrica, antesDe, antesAte), contaDepois: metricaDe(contaDepoisRows, metrica, depoisDe, depoisAte),
      convDepois: somaDe(entDepoisRows, 'conversions', depoisDe, depoisAte),
    })

    const row: ResultadoAcaoRow = {
      operator_id: operatorId, approval_id: approvalId, account_id: accountId, entity_id: entityId,
      nivel, tipo: 'orcamento', metrica, direcao,
      entidade_antes: resultado.entidadeAntes ?? null, entidade_depois: resultado.entidadeDepois ?? null,
      conta_antes: resultado.contaAntes ?? null, conta_depois: resultado.contaDepois ?? null,
      delta_liquido: resultado.deltaLiquido ?? null, veredito: resultado.veredito, motivo: resultado.motivo,
      acao_em: acaoEm,
    }
    await insert(row)
    return { medido: true }
  } catch (e) {
    console.warn('[runAtribuicaoJob] fail-open:', e)
    return { medido: false }
  }
}
