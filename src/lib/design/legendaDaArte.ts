

export const SUFIXO_ARTE_FINAL = ' (arte final)'
export const SUFIXO_EDICAO = ' (edição)'
export const SUFIXO_AJUSTE = ' (ajuste)'

export function sufixoDoSlide(ordem: number): string {
  return ` (slide ${ordem})`
}

export function sufixoDoConceito(conceito: string): string {
  return ` (${conceito})`
}
