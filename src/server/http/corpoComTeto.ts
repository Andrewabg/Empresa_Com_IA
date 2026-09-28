
















export type CorpoLido = { bytes: Uint8Array } | null


export async function lerCorpoComTeto(request: Request, teto: number): Promise<CorpoLido> {
  if (!request.body) return { bytes: new Uint8Array(0) }
  const leitor = request.body.getReader()
  const pedacos: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await leitor.read()
      if (done) break
      if (!value) continue
      total += value.byteLength
      if (total > teto) {
        
        await leitor.cancel().catch(() => {})
        return null
      }
      pedacos.push(value)
    }
  } finally {
    leitor.releaseLock()
  }
  const juntos = new Uint8Array(total)
  let em = 0
  for (const p of pedacos) { juntos.set(p, em); em += p.byteLength }
  return { bytes: juntos }
}


export function pedidoComCorpo(request: Request, bytes: Uint8Array): Request {
  const cabecalhos = new Headers()
  const tipo = request.headers.get('content-type')
  if (tipo) cabecalhos.set('content-type', tipo)
  return new Request(request.url, { method: 'POST', headers: cabecalhos, body: bytes as BodyInit })
}
