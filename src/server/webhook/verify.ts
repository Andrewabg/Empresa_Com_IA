

import { createHmac, timingSafeEqual } from 'node:crypto'


export function verifySignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  
  
  if (!signatureHeader) return false

  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')

  
  
  const a = Buffer.from(signatureHeader, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return false

  return timingSafeEqual(a, b)
}
