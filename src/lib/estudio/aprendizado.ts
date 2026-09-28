
import type { BrandVoicePatch } from '@/lib/estudio/brandVoice'

export type EscopoAprendizado = 'voz_mae' | 'dialeto' | 'diretriz' | 'pontual'

export interface DecisaoAprendizado {
  escopo: EscopoAprendizado
  texto: string          
  canal: string | null   
}


export function classificarFallback(pedido: string, canal?: string | null): DecisaoAprendizado {
  const t = pedido.trim().toLowerCase()
  const texto = pedido.trim()
  
  if (/\b(a marca|a gente|nós|nunca fal|sempre fal|nosso tom|nossa voz|jamais)\b/.test(t)) {
    return { escopo: 'voz_mae', texto, canal: null }
  }
  
  if (canal && (t.includes(canal) || /\b(nesse canal|neste formato|aqui no)\b/.test(t))) {
    return { escopo: 'dialeto', texto, canal }
  }
  
  if (/\b(eu prefiro|prefiro|gosto de|quero sempre|sempre use|não use nunca)\b/.test(t)) {
    return { escopo: 'diretriz', texto, canal: null }
  }
  return { escopo: 'pontual', texto, canal: null }
}

export interface PatchAprendizado {
  brandVoicePatch?: BrandVoicePatch  
  diretriz?: string                  
}


export function montarPatchAprendizado(dec: DecisaoAprendizado): PatchAprendizado {
  if (dec.escopo === 'voz_mae' || dec.escopo === 'dialeto') {
    return { brandVoicePatch: { aprendizados: [{ texto: dec.texto, escopo: dec.escopo, canal: dec.canal }] } }
  }
  if (dec.escopo === 'diretriz') return { diretriz: dec.texto }
  return {} 
}
