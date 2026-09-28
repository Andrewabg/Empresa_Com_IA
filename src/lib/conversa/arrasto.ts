


export function arrasteTemArquivo(types: readonly string[] | undefined | null): boolean {
  return Array.from(types ?? []).includes('Files')
}


export function aoEntrar(profundidade: number): number {
  return profundidade + 1
}


export function aoSair(profundidade: number): number {
  return Math.max(0, profundidade - 1)
}


export function estaAceso(profundidade: number): boolean {
  return profundidade > 0
}
