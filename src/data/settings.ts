import { serverDb } from '@/server/supabase'
import { memoizeAsync } from '@/server/cache/ttlMemoize'


export async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await serverDb()
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error) throw new Error(`getSetting(${key}): ${error.message}`)
  return (data?.value as string | null) ?? null
}


export async function setSetting(key: string, value: string): Promise<void> {
  const { error } = await serverDb()
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw new Error(`setSetting(${key}): ${error.message}`)
}


export async function claimSetting(key: string, value: string): Promise<boolean> {
  const { data, error } = await serverDb()
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, {
      onConflict: 'key',
      ignoreDuplicates: true,
    })
    .select('key')
  if (error) throw new Error(`claimSetting(${key}): ${error.message}`)
  return (data?.length ?? 0) > 0
}


export async function assumirSettingFrio(key: string, valorAntigo: string, valorNovo: string): Promise<boolean> {
  const { data, error } = await serverDb()
    .from('settings')
    .update({ value: valorNovo, updated_at: new Date().toISOString() })
    .eq('key', key)
    .eq('value', valorAntigo)
    .select('key')
  if (error) throw new Error(`assumirSettingFrio(${key}): ${error.message}`)
  return (data?.length ?? 0) > 0
}


export async function releaseSetting(key: string): Promise<void> {
  const { error } = await serverDb().from('settings').delete().eq('key', key)
  if (error) throw new Error(`releaseSetting(${key}): ${error.message}`)
}


export async function getSettings(keys: string[]): Promise<Map<string, string | null>> {
  if (!keys.length) return new Map()
  const { data, error } = await serverDb()
    .from('settings')
    .select('key, value')
    .in('key', keys)
  if (error) throw new Error(`getSettings(${keys.join(',')}): ${error.message}`)
  const map = new Map<string, string | null>(keys.map((k) => [k, null]))
  for (const r of data ?? []) map.set(r.key as string, (r.value as string | null) ?? null)
  return map
}

export interface CompanyProfile {
  companyName: string | null
  operatorName: string | null
  mission: string | null
  voiceTone: string | null
  born: boolean
}


async function getCompanyProfileUncached(): Promise<CompanyProfile> {
  const { data, error } = await serverDb()
    .from('settings')
    .select('key, value')
    .in('key', ['company_name', 'operator_name', 'mission', 'voice_tone', 'company_born'])
  if (error) throw new Error(`getCompanyProfile: ${error.message}`)
  const map = new Map((data ?? []).map((r) => [r.key as string, r.value as string | null]))
  return {
    companyName: map.get('company_name') ?? null,
    operatorName: map.get('operator_name') ?? null,
    mission: map.get('mission') ?? null,
    voiceTone: map.get('voice_tone') ?? null,
    born: map.get('company_born') === 'true',
  }
}

const _companyProfileMemo = memoizeAsync(getCompanyProfileUncached, 60_000)

export async function getCompanyProfile(): Promise<CompanyProfile> {
  return _companyProfileMemo.get()
}

export function invalidateCompanyProfileCache(): void {
  _companyProfileMemo.invalidate()
}
