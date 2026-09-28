



import { ESPERA_MAX_POR_VAGA_MS, VAGAS_DA_BANCADA } from '@/lib/bancada/tipos'

export class BancadaOcupada extends Error {
  constructor() { super('bancada ocupada'); this.name = 'BancadaOcupada' }
}

let emUso = 0
const fila: Array<() => void> = []

export function vagasEmUso(): number { return emUso }

function adquirir(vagas: number, esperaMaxMs: number): Promise<void> {
  if (emUso < vagas) { emUso++; return Promise.resolve() }
  return new Promise<void>((resolve, reject) => {
    const entrar = () => { clearTimeout(timer); emUso++; resolve() }
    const timer = setTimeout(() => {
      const i = fila.indexOf(entrar)
      if (i >= 0) fila.splice(i, 1)
      reject(new BancadaOcupada())
    }, esperaMaxMs)
    fila.push(entrar)
  })
}

function liberar(): void {
  emUso--
  const proximo = fila.shift()
  if (proximo) proximo()
}

export async function comVagaNaBancada<T>(
  fn: () => Promise<T>,
  opts: { vagas?: number; esperaMaxMs?: number } = {},
): Promise<T> {
  await adquirir(opts.vagas ?? VAGAS_DA_BANCADA, opts.esperaMaxMs ?? ESPERA_MAX_POR_VAGA_MS)
  try { return await fn() } finally { liberar() }
}
