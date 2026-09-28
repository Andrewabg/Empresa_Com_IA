


export const DIAS_UTEIS = [1, 2, 3, 4, 5] as const

export function ehDiaUtil(dow: number): boolean {
  return dow >= 1 && dow <= 5
}


export function proximoDiaDaLista(dowAtual: number, dias: number[]): number {
  const alvo = [...new Set(dias)]
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    .sort((a, b) => a - b)
  if (!alvo.length) return 0
  for (let delta = 0; delta < 7; delta++) {
    if (alvo.includes((dowAtual + delta) % 7)) return delta
  }
  return 0
}
