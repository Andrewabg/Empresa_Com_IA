
export function dataRelativa(iso: string, nowIso: string): string {
  const t = Date.parse(iso)
  const now = Date.parse(nowIso)
  if (Number.isNaN(t) || Number.isNaN(now)) return ''
  const s = Math.max(0, Math.floor((now - t) / 1000))
  if (s < 60) return 'agora'
  const min = Math.floor(s / 60)
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  if (h < 48) return 'ontem'
  const d = new Date(t)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}
