
import { getComposioClient, type ComposioClient } from '../actions/composio'

const TTL_MS = 10 * 60_000

let _cache: { at: number; slugs: string[]; todos: string[] } | null = null

export function invalidateNoAuthToolkitsCache(): void { _cache = null }

export interface NoAuthDeps {
  getClient?: () => Promise<ComposioClient | null>
  now?: () => number
}


interface ItemDaListagem { slug?: unknown; noAuth?: unknown; authSchemes?: unknown }


export async function listNoAuthToolkitSlugs(deps: NoAuthDeps = {}): Promise<string[]> {
  return (await carregarListagem(deps)).slugs
}


export async function listTodosOsToolkitSlugs(deps: NoAuthDeps = {}): Promise<string[]> {
  return (await carregarListagem(deps)).todos
}

async function carregarListagem(deps: NoAuthDeps): Promise<{ slugs: string[]; todos: string[] }> {
  const now = deps.now ?? Date.now
  if (_cache && now() - _cache.at < TTL_MS) return _cache
  const vazio = { slugs: [], todos: [] }

  try {
    const c = await (deps.getClient ?? getComposioClient)()
    if (!c) return vazio 
    const res = (await c.toolkits.get({ limit: 500 })) as unknown
    const rows = Array.isArray(res) ? (res as ItemDaListagem[]) : []
    const slugs = rows
      .filter((t) => {
        if (t.noAuth === true) return true
        
        const schemes = Array.isArray(t.authSchemes) ? (t.authSchemes as unknown[]) : null
        return !!schemes && schemes.length > 0 && schemes.every((s) => String(s).toUpperCase() === 'NO_AUTH')
      })
      .map((t) => String(t.slug ?? '').toLowerCase())
      .filter(Boolean)
    const todos = rows.map((t) => String(t.slug ?? '').toLowerCase()).filter(Boolean)
    
    
    if (rows.length > 0) _cache = { at: now(), slugs, todos }
    return { slugs, todos }
  } catch {
    return vazio
  }
}
