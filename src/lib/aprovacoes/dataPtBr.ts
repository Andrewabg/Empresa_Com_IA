





const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']


const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/

export function formatarDataPtBr(iso: string): string | null {
  if (typeof iso !== 'string') return null
  const m = iso.trim().match(ISO_RE)
  if (!m) return null
  const [, ano, mes, dia, hora, min] = m
  const mesIdx = Number(mes) - 1
  if (mesIdx < 0 || mesIdx > 11) return null
  const data = `${dia} ${MESES[mesIdx]} ${ano}`
  return hora !== undefined ? `${data} · ${hora}:${min}` : data
}
