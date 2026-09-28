
export type Papel = 'dono' | 'membro'


const DONO_ONLY_PREFIXES = ['/config', '/integracoes', '/rotinas'] as const


export function conviteValido(
  nowMs: number,
  expiraEmMs: number,
  aceitoEmMs: number | null,
): boolean {
  if (aceitoEmMs !== null) return false
  return nowMs < expiraEmMs
}


export function podeRebaixar(donoCount: number, papelAtual: Papel): boolean {
  if (papelAtual !== 'dono') return false
  return donoCount > 1
}


export function podeRevogar(donoCount: number, papelAlvo: Papel): boolean {
  if (papelAlvo === 'membro') return true
  return donoCount > 1
}


export function papelPodeAcessar(papel: Papel, pathname: string): boolean {
  if (papel === 'dono') return true
  return !DONO_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}




export const SENHA_MIN_CHARS = 8


export const SENHA_MAX_BYTES = 72


export function erroDaSenha(senha: string): string | null {
  if (senha.length < SENHA_MIN_CHARS) {
    return `A senha precisa ter pelo menos ${SENHA_MIN_CHARS} caracteres.`
  }
  if (new TextEncoder().encode(senha).length > SENHA_MAX_BYTES) {
    return 'Essa senha é longa demais. Use até 72 caracteres (letra com acento conta como duas).'
  }
  return null
}


export const DIA_MS = 86_400_000


export function statusConvite(nowMs: number, expiraEmMs: number): 'ativo' | 'expirado' {
  return nowMs < expiraEmMs ? 'ativo' : 'expirado'
}


export function diasParaExpirar(nowMs: number, expiraEmMs: number): number {
  return Math.ceil((expiraEmMs - nowMs) / DIA_MS)
}
