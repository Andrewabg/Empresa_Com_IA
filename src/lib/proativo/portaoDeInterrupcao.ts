

export type VereditoDoPortao = 'interromper' | 'briefing'

export interface FatoCandidato {
  tipo: string
  
  createdAtIso: string
  payload?: Record<string, unknown>
}


export const VALIDADE_MS = 24 * 60 * 60 * 1000


export const SINAIS_TRAFEGO_QUE_INTERROMPEM: readonly string[] = [
  'cpa_disparou', 'queda_conversao', 'sinal_quebrado',
]

function estaFresco(createdAtIso: string, agoraIso: string): boolean {
  const criado = Date.parse(createdAtIso)
  const agora = Date.parse(agoraIso)
  if (!Number.isFinite(criado) || !Number.isFinite(agora)) return false
  return agora - criado <= VALIDADE_MS
}












export function julgarInterrupcao(f: FatoCandidato, agoraIso: string): VereditoDoPortao {
  if (!estaFresco(f.createdAtIso, agoraIso)) return 'briefing'

  
  
  
  
  
  
  
  
  
  
  
  if (f.tipo === 'lembrete') return 'interromper'

  if (f.tipo === 'atendimento_escalado') return 'interromper'

  
  
  
  
  
  if (f.tipo === 'atendimento_sem_resposta') return 'interromper' 
  if (f.tipo === 'canal_desconectado') return 'interromper' 
  if (f.tipo === 'vigilancia_declarada') return 'interromper' 

  if (f.tipo === 'anomalia_trafego') {
    const alerta = f.payload?.['alerta']
    return typeof alerta === 'string' && SINAIS_TRAFEGO_QUE_INTERROMPEM.includes(alerta)
      ? 'interromper'
      : 'briefing'
  }

  return 'briefing'
}


const INSTANTE_QUALQUER = '2000-01-01T00:00:00.000Z'


export function podeAlgumDiaInterromper(tipo: string): boolean {
  const payload = tipo === 'anomalia_trafego' ? { alerta: SINAIS_TRAFEGO_QUE_INTERROMPEM[0] } : undefined
  return julgarInterrupcao(
    { tipo, createdAtIso: INSTANTE_QUALQUER, ...(payload ? { payload } : {}) },
    INSTANTE_QUALQUER,
  ) === 'interromper'
}
