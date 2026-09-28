


export const TIMEOUT_ENVIO_CANAL_MS = 60_000


export const TIMEOUT_ENVIO_ARQUIVO_MS = 180_000



export function prazoDoEnvio(ms = TIMEOUT_ENVIO_CANAL_MS): AbortSignal {
  return AbortSignal.timeout(ms)
}
