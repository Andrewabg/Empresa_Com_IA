
import type { ConnectFailReason } from './activation-outcome'

export interface FalhaComposio {
  status: number | null
  slug: string | null
}

function comoNumero(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}


function slugDaMensagem(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const m = v.match(/"slug"\s*:\s*"([A-Za-z0-9_]+)"/)
  return m ? m[1] : null
}


export function extrairFalhaComposio(err: unknown): FalhaComposio {
  if (typeof err !== 'object' || err === null) return { status: null, slug: null }
  const e = err as Record<string, unknown>
  const causa = (typeof e.cause === 'object' && e.cause !== null ? e.cause : {}) as Record<string, unknown>
  const status =
    comoNumero(e.status) ?? comoNumero(e.statusCode) ?? comoNumero(causa.status) ?? comoNumero(causa.statusCode)
  const slug = slugDaMensagem(e.message) ?? slugDaMensagem(causa.message)
  return { status, slug }
}

const LIMITE = /limit|quota|exceed|plan|upgrade/i

const PERMISSAO = /permission|unauthor|forbidden|scope/i


export function reasonForComposioFailure(falha: FalhaComposio, fallback: ConnectFailReason): ConnectFailReason {
  const { status, slug } = falha
  if (status === 402 || status === 429 || (slug !== null && LIMITE.test(slug))) return 'limite_atingido'
  if (status === 401 || status === 403) return 'sem_permissao'
  if (slug !== null && PERMISSAO.test(slug)) return 'sem_permissao'
  return fallback
}
