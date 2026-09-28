











export function normalizarCaminhoDaNota(p: string): string {
  return p
    .trim()
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s !== '' && s !== '.')
    .join('/')
}
