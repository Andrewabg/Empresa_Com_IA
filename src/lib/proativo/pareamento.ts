

export const PAIRING_TTL_MS = 10 * 60_000
export const MAX_TENTATIVAS = 5

export interface PairingState {
  code: string
  expiresAt: string
  
  tentativas: number
  operatorId: string
}


export function gerarCodigo(rng: () => number): string {
  return String(Math.floor(rng() * 1_000_000)).padStart(6, '0')
}

export type Validacao = { ok: true } | { ok: false; motivo: 'ausente' | 'expirado' | 'bloqueado' | 'incorreto' }

export function validarCodigo(p: PairingState | null, code: string, agoraIso: string): Validacao {
  if (!p) return { ok: false, motivo: 'ausente' }
  if (Date.parse(agoraIso) > Date.parse(p.expiresAt)) return { ok: false, motivo: 'expirado' }
  if (p.tentativas >= MAX_TENTATIVAS) return { ok: false, motivo: 'bloqueado' }
  if (p.code !== code) return { ok: false, motivo: 'incorreto' }
  return { ok: true }
}
