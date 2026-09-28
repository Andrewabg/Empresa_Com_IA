


export const CHAVE_ORCAMENTO = 'proativo_orcamento_dia'


export const TETO_POR_PASSE = 1


export const TETO_DIARIO_PADRAO = 3

export interface EstadoDoOrcamento {
  
  data: string
  gastas: number
  
  tiposGastosHoje?: string[]
}

export interface ConsultaDeOrcamento {
  estado: EstadoDoOrcamento | null
  hojeLocal: string
  gastasNestePasse: number
  tetoDiario?: number
  
  isento: boolean
  
  tipo: string
}

export function podeInterromper(c: ConsultaDeOrcamento): boolean {
  if (c.isento) return true
  if (c.gastasNestePasse >= TETO_POR_PASSE) return false
  
  
  const teto = Number.isFinite(c.tetoDiario) && (c.tetoDiario as number) > 0
    ? (c.tetoDiario as number)
    : TETO_DIARIO_PADRAO
  const mesmoDia = c.estado?.data === c.hojeLocal
  const gastasHoje = mesmoDia ? c.estado!.gastas : 0
  if (gastasHoje >= teto) return false
  
  
  
  
  
  const ehOUltimoCredito = gastasHoje === teto - 1
  const tiposGastosHoje = mesmoDia ? c.estado!.tiposGastosHoje : undefined
  if (ehOUltimoCredito && tiposGastosHoje?.includes(c.tipo)) return false
  return true
}

export function debitar(estado: EstadoDoOrcamento | null, hojeLocal: string, tipo: string): EstadoDoOrcamento {
  const mesmoDia = estado?.data === hojeLocal
  const gastasHoje = mesmoDia ? estado!.gastas : 0
  const tiposAnteriores = mesmoDia ? (estado!.tiposGastosHoje ?? []) : []
  const tiposGastosHoje = tiposAnteriores.includes(tipo) ? tiposAnteriores : [...tiposAnteriores, tipo]
  return { data: hojeLocal, gastas: gastasHoje + 1, tiposGastosHoje }
}


export function lerEstado(raw: string | null): EstadoDoOrcamento | null {
  if (!raw || !raw.trim()) return null
  try {
    const o = JSON.parse(raw) as { data?: unknown; gastas?: unknown; tiposGastosHoje?: unknown }
    if (typeof o?.data !== 'string' || typeof o?.gastas !== 'number' || !Number.isFinite(o.gastas)) return null
    const tiposGastosHoje = Array.isArray(o.tiposGastosHoje) && o.tiposGastosHoje.every((t) => typeof t === 'string')
      ? (o.tiposGastosHoje as string[])
      : undefined
    return { data: o.data, gastas: o.gastas, ...(tiposGastosHoje ? { tiposGastosHoje } : {}) }
  } catch {
    return null
  }
}
