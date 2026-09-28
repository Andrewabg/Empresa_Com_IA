







import { tokenizar, sobreposicao } from '@/lib/text'


function corpoSemHeading(trecho: string): string {
  return trecho.replace(/^\s*#[^\n]*\r?\n+/, '')
}


export function rerankSignal(query: string, note: { título: string | null; trecho: string }): number {
  const qN = new Set(tokenizar(query)).size
  if (qN === 0) return 0
  const corpo = corpoSemHeading(note.trecho)
  return sobreposicao(query, corpo) / qN
}
