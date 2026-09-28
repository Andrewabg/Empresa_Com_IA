
import { createHash } from 'node:crypto'

export interface FatoBruto {
  titulo: string
  corpo: string
  tipo?: string
  tags?: string[]
  
  sourceHash?: string
}


export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')                 
    .replace(/[̀-ͯ]/g, '') 
    .replace(/[^a-z0-9\s]/g, '')     
    .replace(/\s+/g, ' ')            
    .trim()
}

function chave(f: FatoBruto): string {
  return normalizar(f.titulo) + '|' + normalizar(f.corpo)
}


export function contentHashDeTexto(texto: string): string {
  return createHash('sha256').update(normalizar(texto), 'utf8').digest('hex')
}


export function contentHashDeFato(titulo: string, corpo: string): string {
  return contentHashDeTexto('# ' + titulo + '\n\n' + corpo)
}


export function dedupFatos(fatos: FatoBruto[]): FatoBruto[] {
  const seen = new Map<string, FatoBruto>()
  const order: string[] = []

  for (const fato of fatos) {
    const k = chave(fato)
    if (seen.has(k)) {
      
      const existing = seen.get(k)!
      const existingTags = existing.tags ?? []
      const newTags = fato.tags ?? []
      const merged = Array.from(new Set([...existingTags, ...newTags]))
      if (merged.length > 0) {
        seen.set(k, { ...existing, tags: merged })
      }
    } else {
      seen.set(k, { ...fato })
      order.push(k)
    }
  }

  return order.map((k) => seen.get(k)!)
}
