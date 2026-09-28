
import { ASSISTANT_NAME } from '@/lib/brand'


export const BRAND_SETTING_KEYS = [
  'brand_app_name',
  'brand_logo_url',
  'brand_accent',
] as const

export type BrandSettingKey = (typeof BRAND_SETTING_KEYS)[number]

export interface BrandAccent {
  from: string
  to: string
}

export interface Branding {
  appName: string
  assistantName: string
  
  logoUrl: string | null
  
  accent: BrandAccent
}


export const DEFAULT_BRANDING: Branding = {
  appName: 'Awave',
  assistantName: ASSISTANT_NAME,
  logoUrl: null,
  accent: { from: '#28E0C8', to: '#7C5CFF' },
}


export const NAME_MAX = 40

const HEX_RE = /^#[0-9a-fA-F]{6}$/


export function isHexColor(value: string): boolean {
  return HEX_RE.test(value)
}


function resolveName(raw: string | null | undefined, fallback: string): string {
  if (typeof raw !== 'string') return fallback
  const trimmed = raw.trim().slice(0, NAME_MAX)
  return trimmed || fallback
}


function resolveLogoUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:' ? trimmed : null
  } catch {
    return null
  }
}


function resolveAccent(raw: string | null | undefined): BrandAccent {
  const fallback = DEFAULT_BRANDING.accent
  if (typeof raw !== 'string' || !raw.trim()) return { ...fallback }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ...fallback }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...fallback }
  const obj = parsed as { from?: unknown; to?: unknown }
  return {
    from: typeof obj.from === 'string' && isHexColor(obj.from) ? obj.from : fallback.from,
    to: typeof obj.to === 'string' && isHexColor(obj.to) ? obj.to : fallback.to,
  }
}


export function resolveBranding(raw: Record<string, string | null>): Branding {
  return {
    appName: resolveName(raw['brand_app_name'], DEFAULT_BRANDING.appName),
    
    
    assistantName: DEFAULT_BRANDING.assistantName,
    logoUrl: resolveLogoUrl(raw['brand_logo_url']),
    accent: resolveAccent(raw['brand_accent']),
  }
}
