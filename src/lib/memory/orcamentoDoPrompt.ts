
import type { NotaCitada } from '@/server/tools/buscarCerebro'


export const TETO_RECALL_CHARS = 12_000

export function aplicarOrcamento(
  notas: NotaCitada[],
  teto: number = TETO_RECALL_CHARS,
): { mantidas: NotaCitada[]; cortadas: number; charsUsados: number } {
  const mantidas: NotaCitada[] = []
  let usados = 0
  for (const n of notas) {
    const restante = teto - usados
    if (restante <= 0) break
    const trecho = n.trecho ?? ''
    if (trecho.length <= restante) {
      mantidas.push(n)
      usados += trecho.length
      continue
    }
    
    
    
    
    
    
    
    
    if (mantidas.length === 0) {
      mantidas.push({ ...n, trecho: trecho.slice(0, restante) })
      usados = teto
    }
    break
  }
  return { mantidas, cortadas: notas.length - mantidas.length, charsUsados: usados }
}
