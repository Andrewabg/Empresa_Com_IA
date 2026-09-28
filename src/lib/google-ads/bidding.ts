



export const PISO_TCPA = 30

export const PISO_TROAS = 50

export const AJUSTE_MAX = 0.20

export type EstrategiaLance = 'maximizar_conversoes' | 'maximizar_valor' | 'cpa_alvo' | 'roas_alvo'

export interface LanceInput {
  
  conversoes30d: number
  
  temValor: boolean
  
  cpaReal?: number
  
  roasReal?: number
}
export interface RecomendacaoLance {
  estrategia: EstrategiaLance
  
  alvo: number | null
  motivo: 'pouco_volume' | 'volume_para_tcpa' | 'volume_para_troas' | 'sem_ancora'
}


export function recomendarLance(input: LanceInput): RecomendacaoLance {
  const { conversoes30d, temValor, cpaReal, roasReal } = input
  if (conversoes30d >= PISO_TROAS && temValor) {
    if (roasReal != null) return { estrategia: 'roas_alvo', alvo: roasReal, motivo: 'volume_para_troas' }
    
    return { estrategia: 'maximizar_valor', alvo: null, motivo: 'sem_ancora' }
  }
  if (conversoes30d >= PISO_TCPA) {
    if (cpaReal != null) return { estrategia: 'cpa_alvo', alvo: cpaReal, motivo: 'volume_para_tcpa' }
    
    return { estrategia: 'maximizar_conversoes', alvo: null, motivo: 'sem_ancora' }
  }
  return {
    estrategia: temValor ? 'maximizar_valor' : 'maximizar_conversoes',
    alvo: null,
    motivo: 'pouco_volume',
  }
}

export interface AjusteResultado {
  ok: boolean
  
  ajusteRel: number
}


export function validarAjusteAlvo(alvoAtual: number, alvoNovo: number): AjusteResultado {
  if (alvoAtual <= 0 || alvoNovo <= 0) return { ok: false, ajusteRel: 0 }
  const ajusteRel = Math.abs(alvoNovo - alvoAtual) / alvoAtual
  return { ok: ajusteRel <= AJUSTE_MAX, ajusteRel }
}
