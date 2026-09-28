





import { GRAPH_BASE } from '@/server/canais/providers/whatsappCloud'
import type { HttpDeps } from '@/server/canais/types'
import type { LeituraDaInscricao } from '@/lib/instagram/saudeDoToken'

export type { LeituraDaInscricao }


export const CAMPOS_INSCRITOS = 'messages'

export interface ResultadoInscricaoIg {
  ok: boolean
  
  detalhe: string
  
  codigo: number | null
}

export async function inscreverAppNoInstagram(
  input: { igUserId: string; token: string },
  deps: HttpDeps = {},
): Promise<ResultadoInscricaoIg> {
  const fetchFn = deps.fetchFn ?? fetch
  try {
    
    
    
    
    const url = new URL(`${GRAPH_BASE}/me/subscribed_apps`)
    url.searchParams.set('subscribed_fields', CAMPOS_INSCRITOS)
    const res = await fetchFn(url.toString(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${input.token}` },
    })
    if (res.ok) {
      const j = (await res.json().catch(() => null)) as { success?: unknown } | null
      
      if (j && j.success === false) return { ok: false, detalhe: 'a Meta recusou a inscrição', codigo: null }
      return { ok: true, detalhe: '', codigo: null }
    }
    const j = (await res.json().catch(() => null)) as { error?: { message?: string; code?: unknown } } | null
    const codigo = typeof j?.error?.code === 'number' ? j.error.code : null
    return { ok: false, detalhe: j?.error?.message ?? `HTTP ${res.status}`, codigo }
  } catch (err) {
    return { ok: false, detalhe: err instanceof Error ? err.message : String(err), codigo: null }
  }
}


const CODIGO_CREDENCIAL_RECUSADA = 190


export function recebeDaLeitura(leitura: LeituraDaInscricao): boolean | null {
  if (leitura === 'inscrito') return true
  if (leitura === 'nao_sei') return null
  return false
}


export async function consultarInscricaoInstagram(
  input: { igUserId: string; token: string },
  deps: HttpDeps = {},
): Promise<LeituraDaInscricao> {
  const fetchFn = deps.fetchFn ?? fetch
  try {
    const res = await fetchFn(`${GRAPH_BASE}/me/subscribed_apps`, {
      headers: { Authorization: `Bearer ${input.token}` },
    })
    if (!res.ok) {
      const erro = (await res.json().catch(() => null)) as { error?: { code?: unknown } } | null
      return erro?.error?.code === CODIGO_CREDENCIAL_RECUSADA ? 'credencial_recusada' : 'nao_sei'
    }
    const j = (await res.json()) as { data?: unknown }
    if (!Array.isArray(j.data)) return 'nao_sei'
    if (j.data.length === 0) return 'nao_inscrito'
    return inscricaoCobreOEnvio(j.data)
  } catch { return 'nao_sei' }
}


const ASSUNTO_DO_GATILHO = 'messages'

function inscricaoCobreOEnvio(entradas: unknown[]): LeituraDaInscricao {
  let alguemDeclarou = false
  for (const e of entradas) {
    const campos = (e as { subscribed_fields?: unknown } | null)?.subscribed_fields
    if (!Array.isArray(campos)) continue
    alguemDeclarou = true
    
    for (const c of campos) {
      const nome = typeof c === 'string' ? c : (c as { name?: unknown } | null)?.name
      if (nome === ASSUNTO_DO_GATILHO) return 'inscrito'
    }
  }
  return alguemDeclarou ? 'nao_inscrito' : 'inscrito'
}


export function idDeContaValido(igUserId: string): boolean {
  return /^\d{1,20}$/.test(igUserId)
}


const CODIGOS_DE_INEXISTENTE = new Set([100, 803])


export async function contaExisteNoInstagram(
  input: { igUserId: string; token: string },
  deps: HttpDeps = {},
): Promise<boolean | null> {
  if (!idDeContaValido(input.igUserId)) return false
  const fetchFn = deps.fetchFn ?? fetch
  try {
    const url = new URL(`${GRAPH_BASE}/${input.igUserId}`)
    url.searchParams.set('fields', 'id,username')
    const res = await fetchFn(url.toString(), {
      headers: { Authorization: `Bearer ${input.token}` },
    })
    const j = (await res.json().catch(() => null)) as
      | { id?: unknown; username?: unknown; error?: { code?: unknown } }
      | null
    if (res.ok) {
      const mesmaConta = typeof j?.id === 'string' && j.id === input.igUserId
      const temNomeDeInstagram = typeof j?.username === 'string' && j.username.length > 0
      return mesmaConta && temNomeDeInstagram ? true : null
    }
    const codigo = j?.error?.code
    if (typeof codigo === 'number' && CODIGOS_DE_INEXISTENTE.has(codigo)) return false
    return null
  } catch { return null }
}
