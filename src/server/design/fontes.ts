
import path from 'node:path'
import { arquivosDeFonte } from '@/lib/design/fontes'


export const DIR_DE_FONTES = (): string => path.join(process.cwd(), 'fonts')

export interface RegistroDeFontes {
  ok: boolean
  registradas: string[]
  faltando: string[]
}

export class FontesAusentesError extends Error {
  readonly faltando: string[]
  constructor(faltando: string[]) {
    super(`Fontes do estúdio não carregaram: ${faltando.join(', ')} (em ${DIR_DE_FONTES()})`)
    this.name = 'FontesAusentesError'
    this.faltando = faltando
  }
}

let memo: Promise<RegistroDeFontes> | null = null

async function registrar(): Promise<RegistroDeFontes> {
  const { GlobalFonts } = await import('@napi-rs/canvas')
  const dir = DIR_DE_FONTES()
  const registradas: string[] = []
  const faltando: string[] = []
  for (const arquivo of arquivosDeFonte()) {
    let ok = false
    try {
      
      ok = !!GlobalFonts.registerFromPath(path.join(dir, arquivo))
    } catch {
      ok = false
    }
    ;(ok ? registradas : faltando).push(arquivo)
  }
  return { ok: faltando.length === 0, registradas, faltando }
}


export function registrarFontes(): Promise<RegistroDeFontes> {
  if (!memo) {
    
    
    memo = registrar().catch((e) => { memo = null; throw e })
  }
  return memo
}


export async function garantirFontes(): Promise<RegistroDeFontes> {
  const r = await registrarFontes()
  if (!r.ok) throw new FontesAusentesError(r.faltando)
  return r
}
