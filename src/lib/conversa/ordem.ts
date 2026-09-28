

let contador = 0


export function proximaOrdem(): number {
  contador += 1
  return contador
}


export function reiniciarOrdem(): void {
  contador = 0
}
