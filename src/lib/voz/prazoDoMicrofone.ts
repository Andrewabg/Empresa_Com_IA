


export const PRAZO_DO_MICROFONE_MS = 30_000


export interface StreamComTracks {
  getTracks: () => { stop: () => void }[]
}

export type ResultadoDoMicrofone<S extends StreamComTracks = StreamComTracks> =
  
  | { tipo: 'concedido'; stream: S }
  
  | { tipo: 'recusado'; erro: unknown }
  
  | { tipo: 'semResposta' }

export interface PedidoDeMicrofone<S extends StreamComTracks> {
  
  pedir: () => Promise<S>
  
  esperar: (ms: number) => Promise<void>
  prazoMs?: number
}

export async function pedirMicrofoneComPrazo<S extends StreamComTracks>(
  deps: PedidoDeMicrofone<S>,
): Promise<ResultadoDoMicrofone<S>> {
  const prazoMs = deps.prazoMs ?? PRAZO_DO_MICROFONE_MS
  let desistimos = false

  const pedido = deps.pedir()
  
  pedido
    .then((stream) => {
      if (desistimos) for (const t of stream.getTracks()) t.stop()
    })
    .catch(() => {
      
    })

  const resposta = pedido
    .then((stream) => ({ tipo: 'concedido', stream }) as ResultadoDoMicrofone<S>)
    .catch((erro) => ({ tipo: 'recusado', erro }) as ResultadoDoMicrofone<S>)

  const prazo = deps
    .esperar(prazoMs)
    .then(() => ({ tipo: 'semResposta' }) as ResultadoDoMicrofone<S>)

  const resultado = await Promise.race([resposta, prazo])
  if (resultado.tipo === 'semResposta') desistimos = true
  return resultado
}
