
import type { CanalTipo } from '@/data/canais'


export function normalizarTelefone(id: string | null | undefined): string | null {
  if (!id) return null
  if (id.includes('@lid')) return null 
  const semSufixo = id.split('@')[0]
  const digitos = semSufixo.replace(/\D/g, '')
  return digitos.length >= 8 ? digitos : null 
}

const DDI_BR = '55'


function ehDddBr(d: string): boolean {
  const n = Number(d)
  return /^\d{2}$/.test(d) && n >= 11 && n <= 99
}


function variantesBr(digitos: string): string[] {
  const formas = new Set<string>([digitos])
  if (digitos.length === 12 || digitos.length === 13) {
    if (digitos.startsWith(DDI_BR)) {
      const ddd = digitos.slice(2, 4)
      const local = digitos.slice(4)
      if (digitos.length === 13 && local.startsWith('9')) formas.add(DDI_BR + ddd + local.slice(1))
      if (digitos.length === 12 && /^[6-9]/.test(local)) formas.add(DDI_BR + ddd + '9' + local)
      formas.add(digitos.slice(2))
    }
  } else if (ehDddBr(digitos.slice(0, 2))) {
    const local = digitos.slice(2)
    const celular = local.length === 9 && local.startsWith('9')
    const fixo = local.length === 8 && /^[2-5]/.test(local)
    if (celular || fixo) formas.add(DDI_BR + digitos)
  }
  return [...formas]
}


export function variantesDeTelefone(id: string): string[] {
  const digitos = normalizarTelefone(id)
  const formas = new Set<string>([id])
  if (digitos) for (const v of variantesBr(digitos)) formas.add(v)
  return [...formas]
}


export function mesmoTelefone(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizarTelefone(a)
  const nb = normalizarTelefone(b)
  if (!na || !nb) return false
  for (const va of variantesBr(na)) {
    for (const vb of variantesBr(nb)) {
      if (va === vb) return true
    }
  }
  if (na.length >= 8 && nb.endsWith(na)) return true
  if (nb.length >= 8 && na.endsWith(nb)) return true
  return false
}


export function formaComDdiConhecida(
  tipo: CanalTipo, preferida: string, alternativa: string | null | undefined,
): string {
  if (tipo !== 'whatsapp' || !alternativa || alternativa === preferida) return preferida
  
  
  
  if (!normalizarTelefone(preferida)) return preferida
  const digitosAlt = normalizarTelefone(alternativa)
  if (digitosAlt && (digitosAlt.length === 12 || digitosAlt.length === 13)) return alternativa
  return preferida
}
