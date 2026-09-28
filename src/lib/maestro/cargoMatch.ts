


export function normalizarCargo(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') 
    .toLowerCase()
    .replace(/(?:\s*\([^()]*\))+\s*$/, '') 
    .replace(/\s+/g, ' ')
    .trim()
}


export function cargosEquivalentes(a: string, b: string): boolean {
  const na = normalizarCargo(a)
  return na !== '' && na === normalizarCargo(b)
}
