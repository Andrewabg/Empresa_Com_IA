
import { isSafeNotePath } from '@/lib/brain/safePath'
import { estaArquivada } from '@/lib/brain/arquivoDeNotas'
import { escopoDeLeitura, dentroDoEscopo } from '@/lib/brain/escopoDeLeitura'


export const PAGINA_CHARS = 6000

export function paginar(
  texto: string,
  pagina: number,
  tamanho: number = PAGINA_CHARS,
): { trecho: string; pagina: number; totalPaginas: number; temMais: boolean } {
  const n = Math.max(1, Math.trunc(pagina) || 1)
  const total = Math.max(1, Math.ceil(texto.length / tamanho))
  if (n > total) return { trecho: '', pagina: n, totalPaginas: total, temMais: false }
  const inicio = (n - 1) * tamanho
  const trecho = texto.slice(inicio, inicio + tamanho)
  return { trecho, pagina: n, totalPaginas: total, temMais: n < total }
}


export function caminhoPermitido(path: string, scopes: string[] | null | undefined): boolean {
  if (!isSafeNotePath(path)) return false
  if (path.includes('%')) return false
  if (!path.endsWith('.md')) return false
  if (estaArquivada(path)) return false
  
  
  
  const escopo = escopoDeLeitura(scopes)
  if (escopo.modo === 'tudo') return true
  if (escopo.modo === 'nada') return false
  return dentroDoEscopo(path, escopo.prefixos)
}
