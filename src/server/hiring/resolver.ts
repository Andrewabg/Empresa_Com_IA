
import { matchAliases, normalizarTermo } from '@/lib/hiring/toolkit-aliases'
import {
  planActivationFromToolkit,
  toolkitDisplayName,
  type ActivationPlan,
  type ToolkitAuthMeta,
} from '../config/connections'
import { list as registrySnapshot, hydrateToolkitRegistry, type ToolkitMeta } from '../config/toolkitRegistry'
import { getComposioClient } from '../actions/composio'

export interface ResolvedToolkit {
  slug: string
  name: string
  icon?: string
  
  activation?: ActivationPlan
  
  validado: boolean
}


export interface ToolkitLookup {
  slug: string
  name: string
  icon?: string
  meta: ToolkitAuthMeta
}

export interface ResolverDeps {
  
  registryList?: () => ToolkitMeta[]
  
  getToolkit?: (slug: string) => Promise<ToolkitLookup | null>
  
  searchToolkits?: (q: string) => Promise<{ slug: string; name: string }[]>
}


function escRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}


export function slugifyMencao(s: string): string {
  return normalizarTermo(s).replace(/[^a-z0-9]+/g, '')
}


function nomeBateNaMencao(name: string, mencaoNormalizada: string): boolean {
  const n = normalizarTermo(name).trim()
  if (!n) return false
  const rx = new RegExp(`(^|\\P{L})${escRx(n)}($|\\P{L})`, 'u')
  return rx.test(mencaoNormalizada)
}



async function defaultGetToolkit(slug: string): Promise<ToolkitLookup | null> {
  try {
    const c = await getComposioClient()
    if (!c) return null
    const raw = (await c.toolkits.get(slug)) as unknown as Record<string, unknown>
    return {
      slug: typeof raw.slug === 'string' && raw.slug ? raw.slug : slug,
      name: typeof raw.name === 'string' && raw.name ? raw.name : toolkitDisplayName(slug),
      icon: (raw.meta as { logo?: string } | undefined)?.logo,
      
      
      meta: raw as unknown as ToolkitAuthMeta,
    }
  } catch {
    
    
    return null
  }
}



const LIST_TTL_MS = 10 * 60_000
let _listaToolkits: { at: number; rows: { slug: string; name: string }[] } | null = null

async function defaultSearchToolkits(q: string): Promise<{ slug: string; name: string }[]> {
  try {
    const c = await getComposioClient()
    if (!c) return []
    if (!_listaToolkits || Date.now() - _listaToolkits.at >= LIST_TTL_MS) {
      const res = (await c.toolkits.get({ limit: 500 })) as unknown as { slug?: unknown; name?: unknown }[]
      const rows = (Array.isArray(res) ? res : [])
        .map((t) => ({ slug: String(t.slug ?? ''), name: String(t.name ?? '') }))
        .filter((t) => t.slug && t.name)
      
      
      if (rows.length > 0) _listaToolkits = { at: Date.now(), rows }
    }
    if (!_listaToolkits) return [] 
    const nq = normalizarTermo(q)
    return _listaToolkits.rows.filter((t) => nomeBateNaMencao(t.name, nq))
  } catch {
    return [] 
  }
}




export async function resolverToolkits(
  mencoes: string[],
  deps: ResolverDeps = {},
): Promise<ResolvedToolkit[]> {
  const getToolkit = deps.getToolkit ?? defaultGetToolkit
  const searchToolkits = deps.searchToolkits ?? defaultSearchToolkits
  let registryList = deps.registryList
  if (!registryList) {
    
    
    await hydrateToolkitRegistry()
    registryList = registrySnapshot
  }

  const out = new Map<string, ResolvedToolkit>()

  for (const mencao of mencoes) {
    const texto = (mencao ?? '').trim()
    if (!texto) continue
    const nMencao = normalizarTermo(texto)

    
    const curados = new Set<string>(matchAliases(texto))
    for (const item of registryList()) {
      if (nomeBateNaMencao(item.name, nMencao)) curados.add(item.slug)
    }

    if (curados.size > 0) {
      for (const slug of curados) {
        if (out.has(slug)) continue
        const tk = await getToolkit(slug)
        if (tk) {
          out.set(slug, {
            slug,
            name: tk.name,
            ...(tk.icon ? { icon: tk.icon } : {}),
            activation: planActivationFromToolkit(tk.meta),
            validado: true,
          })
        } else {
          
          
          out.set(slug, { slug, name: toolkitDisplayName(slug), validado: false })
        }
      }
      continue
    }

    
    
    const probeSlug = slugifyMencao(texto)
    if (probeSlug) {
      const tk = await getToolkit(probeSlug)
      if (tk) {
        if (!out.has(tk.slug)) {
          out.set(tk.slug, {
            slug: tk.slug,
            name: tk.name,
            ...(tk.icon ? { icon: tk.icon } : {}),
            activation: planActivationFromToolkit(tk.meta),
            validado: true,
          })
        }
        continue
      }
    }
    
    const achados = await searchToolkits(nMencao)
    for (const hit of achados) {
      if (out.has(hit.slug)) continue
      
      
      const tk = await getToolkit(hit.slug)
      out.set(hit.slug, {
        slug: hit.slug,
        name: tk?.name ?? hit.name,
        ...(tk?.icon ? { icon: tk.icon } : {}),
        ...(tk ? { activation: planActivationFromToolkit(tk.meta) } : {}),
        validado: true,
      })
    }
  }

  return [...out.values()]
}
