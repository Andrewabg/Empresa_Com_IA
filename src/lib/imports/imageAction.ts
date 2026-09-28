


export function parseImageN(raw: string): number | null {
  
  if (!/^[0-9]+$/.test(raw)) return null
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) return null
  return n
}


export function parseAcao(body: unknown): 'ler' | 'descartar' | null {
  if (typeof body !== 'object' || body === null) return null
  const acao = (body as { acao?: unknown }).acao
  return acao === 'ler' || acao === 'descartar' ? acao : null
}


export function acaoParaStatus(acao: 'ler' | 'descartar'): 'queued' | 'discarded' {
  return acao === 'ler' ? 'queued' : 'discarded'
}
