






export type StatusConta =
  | 'ativa'
  | 'desabilitada'
  | 'pendente_risco'
  | 'pendente_billing'
  | 'em_carencia'
  | 'fechada'
  | 'desconhecida'

export interface SaudeConta {
  status: StatusConta
  contaOk: boolean 
  contaProblema: boolean 
  motivoConta?: string 
  spendCapPertoDoTeto: boolean 
  reprovadosCount: number 
  reprovadosPorCampanha: Record<string, number>
  campanhasAfetadas: Set<string> 
}


export const TETO_SPEND_CAP = 0.9


const STATUS_POR_CODIGO: Readonly<Record<number, StatusConta>> = {
  1: 'ativa', 
  2: 'desabilitada', 
  3: 'pendente_billing', 
  7: 'pendente_risco', 
  8: 'pendente_billing', 
  9: 'em_carencia', 
  100: 'fechada', 
  101: 'fechada', 
}


const STATUS_PROBLEMA: ReadonlySet<StatusConta> = new Set<StatusConta>([
  'desabilitada',
  'pendente_risco',
  'pendente_billing',
  'em_carencia',
  'fechada',
])


const MOTIVO_POR_STATUS: Readonly<Record<StatusConta, string | undefined>> = {
  ativa: undefined,
  desconhecida: undefined,
  desabilitada: 'Conta desabilitada',
  pendente_risco: 'Conta em análise de risco (não está entregando)',
  pendente_billing: 'Pendência de pagamento',
  em_carencia: 'Conta em carência',
  fechada: 'Conta fechada',
}


const STATUS_REPROVADO: ReadonlySet<string> = new Set(['DISAPPROVED', 'WITH_ISSUES'])


export function avaliarSaudeConta(input: {
  contaHealth?: { accountStatus?: number; disableReason?: number; spendCap?: number; amountSpent?: number }
  ads?: { effectiveStatus?: string; campaignId?: string }[]
}): SaudeConta {
  const h = input.contaHealth
  const status: StatusConta = h?.accountStatus !== undefined ? (STATUS_POR_CODIGO[h.accountStatus] ?? 'desconhecida') : 'desconhecida'
  const contaProblema = STATUS_PROBLEMA.has(status)

  
  const spendCap = h?.spendCap
  const amountSpent = h?.amountSpent
  const spendCapPertoDoTeto =
    spendCap !== undefined && amountSpent !== undefined && spendCap > 0 && amountSpent >= spendCap * TETO_SPEND_CAP

  
  
  const reprovadosPorCampanha: Record<string, number> = {}
  const campanhasAfetadas = new Set<string>()
  let reprovadosCount = 0
  for (const ad of input.ads ?? []) {
    const eff = typeof ad.effectiveStatus === 'string' ? ad.effectiveStatus.toUpperCase() : undefined
    if (eff === undefined || !STATUS_REPROVADO.has(eff)) continue
    reprovadosCount++
    const cid = ad.campaignId
    if (typeof cid === 'string' && cid !== '') {
      reprovadosPorCampanha[cid] = (reprovadosPorCampanha[cid] ?? 0) + 1
      campanhasAfetadas.add(cid)
    }
  }

  const out: SaudeConta = {
    status,
    contaOk: status === 'ativa',
    contaProblema,
    spendCapPertoDoTeto,
    reprovadosCount,
    reprovadosPorCampanha,
    campanhasAfetadas,
  }
  const motivo = contaProblema ? MOTIVO_POR_STATUS[status] : undefined
  if (motivo !== undefined) out.motivoConta = motivo
  return out
}


function num(x: unknown): number | undefined {
  if (x === null || x === undefined || x === '') return undefined
  const n = typeof x === 'number' ? x : typeof x === 'string' ? Number(x) : NaN
  return Number.isFinite(n) ? n : undefined
}


function str(x: unknown): string | undefined {
  return typeof x === 'string' && x !== '' ? x : undefined
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}


export function parseAccountHealth(
  row: Record<string, unknown>,
): { accountStatus?: number; disableReason?: number; spendCap?: number; amountSpent?: number; balance?: number; funding?: string } {
  const out: { accountStatus?: number; disableReason?: number; spendCap?: number; amountSpent?: number; balance?: number; funding?: string } = {}
  const accountStatus = num(row.account_status)
  if (accountStatus !== undefined) out.accountStatus = accountStatus
  const disableReason = num(row.disable_reason)
  if (disableReason !== undefined) out.disableReason = disableReason
  const spendCap = num(row.spend_cap)
  if (spendCap !== undefined) out.spendCap = spendCap
  const amountSpent = num(row.amount_spent)
  if (amountSpent !== undefined) out.amountSpent = amountSpent
  const balance = num(row.balance)
  if (balance !== undefined) out.balance = balance
  
  const funding = str(row.funding_source) ?? (isRecord(row.funding_source_details) ? str(row.funding_source_details.type) : undefined)
  if (funding !== undefined) out.funding = funding
  return out
}


export function parseAdReview(
  row: Record<string, unknown>,
): { id: string; nome?: string; effectiveStatus?: string; campaignId?: string; adsetId?: string } {
  const rawId = row.id
  const id = typeof rawId === 'string' ? rawId : typeof rawId === 'number' && Number.isFinite(rawId) ? String(rawId) : ''
  const out: { id: string; nome?: string; effectiveStatus?: string; campaignId?: string; adsetId?: string } = { id }
  const nome = str(row.name)
  if (nome !== undefined) out.nome = nome
  const effectiveStatus = str(row.effective_status)
  if (effectiveStatus !== undefined) out.effectiveStatus = effectiveStatus
  const campaignId = str(row.campaign_id)
  if (campaignId !== undefined) out.campaignId = campaignId
  const adsetId = str(row.adset_id)
  if (adsetId !== undefined) out.adsetId = adsetId
  return out
}
