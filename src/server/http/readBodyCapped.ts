







export const WEBHOOK_MAX_BYTES = 1_000_000 
export const HUB_MAX_BYTES = 5_000_000 

export type CappedBody =
  | { ok: true; text: string }
  | { ok: false; reason: 'too_large' | 'read_failed' }

interface BodySource {
  headers: Headers
  body: ReadableStream<Uint8Array> | null
  text: () => Promise<string>
}

export async function readBodyCapped(src: BodySource, maxBytes: number): Promise<CappedBody> {
  
  const declared = Number(src.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, reason: 'too_large' }

  
  if (!src.body) {
    try { return { ok: true, text: await src.text() } } catch { return { ok: false, reason: 'read_failed' } }
  }

  
  const reader = src.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        total += value.byteLength
        if (total > maxBytes) {
          try { await reader.cancel() } catch {  }
          return { ok: false, reason: 'too_large' }
        }
        chunks.push(value)
      }
    }
  } catch {
    return { ok: false, reason: 'read_failed' }
  }

  const buf = new Uint8Array(total)
  let off = 0
  for (const c of chunks) { buf.set(c, off); off += c.byteLength }
  return { ok: true, text: new TextDecoder('utf-8').decode(buf) }
}
