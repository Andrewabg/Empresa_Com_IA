
import { checkToolkitConnections, type ConnectionsReport } from '@/server/config/connections'
import { list as registryList } from '@/server/config/toolkitRegistry'
import { getComposioClient } from '@/server/actions/composio'


export interface MarketplaceToolkit {
  slug: string
  name: string
  connected: boolean
  destaque: boolean
  requiredBy: string[]
  icon?: string
  category?: string
  categoryName?: string
  descricao?: string
  
  semAuth?: boolean
}

export interface MarketplaceReport {
  configured: boolean
  cards: MarketplaceToolkit[]
}


export interface CatalogoToolkit {
  slug: string
  name: string
  icon?: string
  category?: string
  categoryName?: string
  descricao?: string
  
  semAuth?: boolean
}

export interface MarketplaceDeps {
  getReport?: () => Promise<ConnectionsReport>
  getCatalogo?: () => Promise<CatalogoToolkit[]>
  getRegistrySlugs?: () => string[]
}


const LIST_TTL_MS = 10 * 60_000
let _catalogo: { at: number; rows: CatalogoToolkit[] } | null = null



interface RawItem { slug?: unknown; name?: unknown; no_auth?: unknown; noAuth?: unknown; meta?: { logo?: unknown; description?: unknown; categories?: { slug?: unknown; name?: unknown }[] } }


export function mapItemCatalogo(item: RawItem): CatalogoToolkit {
  const cat0 = Array.isArray(item.meta?.categories) ? item.meta!.categories![0] : undefined
  const out: CatalogoToolkit = { slug: String(item.slug ?? ''), name: String(item.name ?? '') }
  const logo = item.meta?.logo
  if (typeof logo === 'string' && logo) out.icon = logo
  if (cat0 && typeof cat0.slug === 'string' && cat0.slug) out.category = cat0.slug
  if (cat0 && typeof cat0.name === 'string' && cat0.name) out.categoryName = cat0.name
  const desc = item.meta?.description
  if (typeof desc === 'string' && desc) out.descricao = desc
  if (item.no_auth === true || item.noAuth === true) out.semAuth = true
  return out
}


async function defaultGetCatalogo(): Promise<CatalogoToolkit[]> {
  try {
    if (_catalogo && Date.now() - _catalogo.at < LIST_TTL_MS) return _catalogo.rows
    const c = await getComposioClient()
    if (!c) return []
    const res = (await c.toolkits.get({ limit: 500 })) as unknown as RawItem[]
    const rows = (Array.isArray(res) ? res : []).map(mapItemCatalogo).filter((t) => t.slug && t.name)
    if (rows.length > 0) _catalogo = { at: Date.now(), rows }
    return rows
  } catch {
    return []
  }
}


export async function listarMarketplace(deps: MarketplaceDeps = {}): Promise<MarketplaceReport> {
  const getReport = deps.getReport ?? checkToolkitConnections
  const report = await getReport()
  if (!report.configured || !report.healthOk) return { configured: report.configured, cards: [] }

  
  const getRegistrySlugs = deps.getRegistrySlugs ?? (() => registryList().map((t) => t.slug))
  const registro = new Set(getRegistrySlugs().map((s) => s.toLowerCase()))

  const getCatalogo = deps.getCatalogo ?? defaultGetCatalogo
  const catalogo = await getCatalogo().catch(() => [] as CatalogoToolkit[])

  const bySlug = new Map<string, MarketplaceToolkit>()
  for (const tk of report.toolkits) {
    bySlug.set(tk.slug.toLowerCase(), {
      slug: tk.slug,
      name: tk.name,
      connected: tk.connected,
      destaque: registro.has(tk.slug.toLowerCase()),
      requiredBy: tk.requiredBy ?? [],
      ...(tk.semAuth ? { semAuth: true } : {}),
      ...(tk.icon ? { icon: tk.icon } : {}),
      ...(tk.category ? { category: tk.category } : {}),
    })
  }
  for (const cat of catalogo) {
    const k = cat.slug.toLowerCase()
    const cur = bySlug.get(k)
    if (cur) {
      if (!cur.icon && cat.icon) cur.icon = cat.icon
      if (!cur.descricao && cat.descricao) cur.descricao = cat.descricao
      if (!cur.categoryName && cat.categoryName) cur.categoryName = cat.categoryName
      if (!cur.category && cat.category) cur.category = cat.category
      
      
      if (!cur.semAuth && cat.semAuth) cur.semAuth = true
    } else {
      bySlug.set(k, {
        slug: cat.slug, name: cat.name, connected: false, destaque: false, requiredBy: [],
        ...(cat.semAuth ? { semAuth: true } : {}),
        ...(cat.icon ? { icon: cat.icon } : {}),
        ...(cat.category ? { category: cat.category } : {}),
        ...(cat.categoryName ? { categoryName: cat.categoryName } : {}),
        ...(cat.descricao ? { descricao: cat.descricao } : {}),
      })
    }
  }
  return { configured: true, cards: [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug)) }
}
