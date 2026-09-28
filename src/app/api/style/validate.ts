import { DIAL_NAMES, type StyleDials, type StyleDial } from '@/lib/style'

export interface StylePatch { dials?: StyleDials; notas?: string; learningPaused?: boolean }
export type ValidateResult = { ok: true; patch: StylePatch } | { ok: false; error: string }

function isDial(n: unknown): n is StyleDial {
  return typeof n === 'number' && Number.isInteger(n) && n >= -2 && n <= 2
}

export function validateStylePatch(body: unknown): ValidateResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body inválido' }
  const b = body as Record<string, unknown>
  const patch: StylePatch = {}
  if ('dials' in b) {
    const d = b.dials
    if (!d || typeof d !== 'object') return { ok: false, error: 'dials inválido' }
    const dials = {} as StyleDials
    for (const name of DIAL_NAMES) {
      const v = (d as Record<string, unknown>)[name]
      if (!isDial(v)) return { ok: false, error: `dials.${name} deve ser inteiro [-2,2]` }
      dials[name] = v
    }
    patch.dials = dials 
  }
  if ('notas' in b) {
    if (typeof b.notas !== 'string') return { ok: false, error: 'notas deve ser string' }
    if (b.notas.length > 4000) return { ok: false, error: 'notas muito longa (máx 4000)' }
    patch.notas = b.notas
  }
  if ('learningPaused' in b) {
    if (typeof b.learningPaused !== 'boolean') return { ok: false, error: 'learningPaused deve ser boolean' }
    patch.learningPaused = b.learningPaused
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: 'patch vazio' }
  return { ok: true, patch }
}
