

export type UxState = 'ok' | 'empty' | 'loading' | 'error' | 'offline'

const VALID: readonly UxState[] = ['ok', 'empty', 'loading', 'error', 'offline']


export function parseUxState(raw: string | string[] | null | undefined): UxState {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value && (VALID as readonly string[]).includes(value)) {
    return value as UxState
  }
  return 'ok'
}
