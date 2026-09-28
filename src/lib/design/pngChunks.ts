
























const ASSINATURA: readonly number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]


const CABECALHO = 8
const CRC = 4


export const CHUNKS_QUE_RENDERIZAM: ReadonlySet<string> = new Set([
  'IHDR', 'PLTE', 'IDAT', 'IEND',
  'tRNS',
  'gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT', 'bKGD',
  'pHYs',
])


export function ehPng(bytes: Uint8Array): boolean {
  if (bytes.length < ASSINATURA.length) return false
  return ASSINATURA.every((b, i) => bytes[i] === b)
}


function tamanhoDoChunk(bytes: Uint8Array, off: number): number {
  return bytes[off]! * 0x1000000 + (bytes[off + 1]! << 16) + (bytes[off + 2]! << 8) + bytes[off + 3]!
}

function tipoDoChunk(bytes: Uint8Array, off: number): string {
  return String.fromCharCode(bytes[off + 4]!, bytes[off + 5]!, bytes[off + 6]!, bytes[off + 7]!)
}


export function tiposDeChunk(bytes: Uint8Array): string[] {
  if (!ehPng(bytes)) return []
  const out: string[] = []
  let off = ASSINATURA.length
  while (off + CABECALHO + CRC <= bytes.length) {
    const tamanho = tamanhoDoChunk(bytes, off)
    const tipo = tipoDoChunk(bytes, off)
    const fim = off + CABECALHO + tamanho + CRC
    if (fim > bytes.length) break
    out.push(tipo)
    off = fim
    if (tipo === 'IEND') break
  }
  return out
}


export function limparMetadadosDoPng(bytes: Uint8Array): Uint8Array {
  if (!ehPng(bytes)) return bytes

  const manter: { inicio: number; fim: number }[] = []
  let off = ASSINATURA.length
  let sobrou = false
  let fechou = false
  while (off + CABECALHO + CRC <= bytes.length) {
    const tamanho = tamanhoDoChunk(bytes, off)
    const tipo = tipoDoChunk(bytes, off)
    const fim = off + CABECALHO + tamanho + CRC
    
    
    if (fim > bytes.length) return bytes
    if (CHUNKS_QUE_RENDERIZAM.has(tipo)) manter.push({ inicio: off, fim })
    else sobrou = true
    off = fim
    if (tipo === 'IEND') { fechou = true; break }
  }
  
  
  
  if (!fechou || !sobrou || !manter.length) return bytes

  const total = ASSINATURA.length + manter.reduce((s, c) => s + (c.fim - c.inicio), 0)
  const out = new Uint8Array(total)
  out.set(bytes.subarray(0, ASSINATURA.length), 0)
  let cursor = ASSINATURA.length
  for (const c of manter) {
    out.set(bytes.subarray(c.inicio, c.fim), cursor)
    cursor += c.fim - c.inicio
  }
  return out
}
