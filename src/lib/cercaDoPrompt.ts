


export function neutralizarCerca(s: string): string {
  return s.replace(/[«»]/g, '"')
}
