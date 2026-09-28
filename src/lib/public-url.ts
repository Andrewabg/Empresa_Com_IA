

import { primeiroValorUtil } from './env-supabase'


export interface OrigemEncaminhada {
  
  proto?: string | null
  
  host?: string | null
}


function primeiroDaCadeia(v: string | null | undefined): string {
  return (v ?? '').split(',')[0]!.trim()
}


function hostInterno(host: string): boolean {
  const h = host.toLowerCase().replace(/:\d+$/, '')
  return (
    h === '0.0.0.0' ||
    h === 'localhost' ||
    h === '[::]' ||
    h === '[::1]' ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)
  )
}


export function origemInterna(origin: string | undefined | null): boolean {
  const o = origin?.trim()
  if (!o) return true
  try {
    return hostInterno(new URL(o).host)
  } catch {
    return true
  }
}


function hostEncaminhadoUsavel(host: string): boolean {
  if (!host) return false
  
  
  if (/[\s/\\@?#]/.test(host)) return false
  return !hostInterno(host)
}


export function resolvePublicBaseUrl(
  envBaseUrl: string | undefined,
  fallbackOrigin?: string,
  encaminhado?: OrigemEncaminhada,
): string {
  const env = envBaseUrl?.trim()
  if (env) return env.replace(/\/+$/, '')

  if (origemInterna(fallbackOrigin)) {
    const host = primeiroDaCadeia(encaminhado?.host)
    if (hostEncaminhadoUsavel(host)) {
      const proto = primeiroDaCadeia(encaminhado?.proto).toLowerCase()
      
      const esquema = proto === 'http' || proto === 'https' ? proto : 'https'
      return `${esquema}://${host}`.replace(/\/+$/, '')
    }
  }

  return (fallbackOrigin ?? 'http://localhost:3000').replace(/\/+$/, '')
}


export function publicBaseUrl(fallbackOrigin?: string, encaminhado?: OrigemEncaminhada): string {
  
  
  
  const env = process.env as Record<string, string | undefined>
  return resolvePublicBaseUrl(
    primeiroValorUtil(env['NEXT_PUBLIC_BASE_URL'], process.env.NEXT_PUBLIC_BASE_URL),
    fallbackOrigin,
    encaminhado,
  )
}


export function baseUrlDaRequisicao(request: Request): string {
  return publicBaseUrl(new URL(request.url).origin, {
    proto: request.headers.get('x-forwarded-proto'),
    host: request.headers.get('x-forwarded-host'),
  })
}
