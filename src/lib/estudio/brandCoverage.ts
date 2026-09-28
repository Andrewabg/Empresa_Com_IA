
import type { BrandVoice } from '@/lib/estudio/brandVoice'

export interface BrandGap { id: string; label: string; seed: string }

const GAPS: { id: string; label: string; seed: string; ok: (v: BrandVoice) => boolean }[] = [
  { id: 'negocio', label: 'O que a marca é / faz', seed: 'Em uma frase, o que a marca faz e pra quem?', ok: (v) => !!v.dna?.negocio?.trim() },
  { id: 'oferta', label: 'Oferta principal', seed: 'Qual o produto/oferta principal que a copy vai vender?', ok: (v) => !!v.dna?.ofertas?.length },
  { id: 'publico', label: 'Público (dor/desejo)', seed: 'Qual a dor ou o desejo mais forte do cliente ideal?', ok: (v) => !!(v.dna?.publico?.dores?.length || v.dna?.publico?.desejos?.length) },
  { id: 'voz', label: 'Voz da marca', seed: 'Como a marca soa — formal, próxima, ousada? Tem palavra que nunca usa?', ok: (v) => !!v.voz_mae?.personalidade?.trim() },
]

export interface BrandCoverage { cobertos: string[]; faltando: BrandGap[]; minDone: boolean }

export function brandCoverage(voice: BrandVoice): BrandCoverage {
  const cobertos: string[] = []
  const faltando: BrandGap[] = []
  for (const g of GAPS) {
    if (g.ok(voice)) cobertos.push(g.id)
    else faltando.push({ id: g.id, label: g.label, seed: g.seed })
  }
  return { cobertos, faltando, minDone: faltando.length === 0 }
}


export function temDnaDaMarca(voice: BrandVoice): boolean {
  return brandCoverage(voice).cobertos.length > 0
}
