

import { extrairPendencias } from './minuta'

export interface PreenchimentoResult {
  texto: string
  
  restantes: string[]
}


export function preencherMarcadores(texto: string, valores: Record<string, string>): PreenchimentoResult {
  const mapa = new Map<string, string>()
  for (const [k, v] of Object.entries(valores)) {
    const key = k.trim()
    const val = (v ?? '').trim()
    if (key && val) mapa.set(key, val)
  }
  const novo = texto.replace(/\[PENDENTE:([^\]]+)\]/g, (full, descr) => {
    const val = mapa.get(String(descr).trim())
    return val ?? full
  })
  return { texto: novo, restantes: extrairPendencias(novo) }
}
