import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifySignature(secret: string, body: string, signature: string): boolean {
  const mac = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
  const a = Buffer.from(mac), b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function changedPathsFromPush(payload: any): { added: string[]; modified: string[]; removed: string[] } {
  const md = (xs: string[] = []) => xs.filter(p => p.endsWith('.md'))
  const acc = { added: [] as string[], modified: [] as string[], removed: [] as string[] }
  for (const c of payload.commits ?? []) {
    acc.added.push(...md(c.added))
    acc.modified.push(...md(c.modified))
    acc.removed.push(...md(c.removed))
  }
  return acc
}
