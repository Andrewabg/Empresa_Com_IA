import { serverDb } from '../server/supabase'

export interface BrandRow {
  id: string
  operator_id: string
  nome: string
  slug: string
  is_default: boolean
  created_at: string
}


export function slugify(nome: string): string {
  
  return nome
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'marca'
}

export async function getBrand(operatorId: string, brandId: string): Promise<BrandRow | null> {
  const { data, error } = await serverDb().from('brands')
    .select('*').eq('operator_id', operatorId).eq('id', brandId).maybeSingle()
  if (error) throw new Error(`getBrand: ${error.message}`)
  return (data as BrandRow) ?? null
}

export async function listBrands(operatorId: string): Promise<BrandRow[]> {
  const { data, error } = await serverDb().from('brands')
    .select('*').eq('operator_id', operatorId).order('created_at', { ascending: true })
  if (error) throw new Error(`listBrands: ${error.message}`)
  return (data ?? []) as BrandRow[]
}


export async function getDefaultBrand(operatorId: string): Promise<BrandRow | null> {
  const { data, error } = await serverDb().from('brands')
    .select('*').eq('operator_id', operatorId).eq('is_default', true)
    .order('created_at', { ascending: true }).limit(1).maybeSingle()
  if (error) throw new Error(`getDefaultBrand: ${error.message}`)
  return (data as BrandRow) ?? null
}



export async function listBrandsDoInstall(limite = 5): Promise<BrandRow[]> {
  const { data, error } = await serverDb().from('brands')
    .select('*').order('created_at', { ascending: true }).limit(limite)
  if (error) throw new Error(`listBrandsDoInstall: ${error.message}`)
  return (data ?? []) as BrandRow[]
}

export async function ensureDefaultBrand(operatorId: string, nome: string): Promise<BrandRow> {
  const existing = await getDefaultBrand(operatorId)
  if (existing) return existing
  const slug = slugify(nome)
  const { data, error } = await serverDb().from('brands')
    .upsert({ operator_id: operatorId, nome, slug, is_default: true }, { onConflict: 'operator_id,slug' })
    .select('*').single()
  if (error) throw new Error(`ensureDefaultBrand: ${error.message}`)
  return data as BrandRow
}
