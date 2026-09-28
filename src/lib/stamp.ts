




export type Stamp = {
  licensee: { name: string; cpf?: string; email?: string }
  license_id: string
  ref: string
  issued_at: string
  source: string
}

export function parseStamp(raw: unknown): Stamp | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const lic = o.licensee
  if (!lic || typeof lic !== 'object') return null
  const name = (lic as Record<string, unknown>).name
  if (typeof name !== 'string' || name.length === 0) return null
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
  const l = lic as Record<string, unknown>
  return {
    licensee: { name, cpf: str(l.cpf), email: str(l.email) },
    license_id: str(o.license_id) ?? '',
    ref: str(o.ref) ?? '',
    issued_at: str(o.issued_at) ?? '',
    source: str(o.source) ?? '',
  }
}
