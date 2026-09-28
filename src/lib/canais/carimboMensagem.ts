































const MINUTO_MS = 60_000
const HORA_MS = 60 * MINUTO_MS
const DIA_MS = 24 * HORA_MS

function paraMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}


function inicioDoDia(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}


function diasAtras(agoraMs: number, alvoMs: number): number {
  return Math.round((inicioDoDia(agoraMs) - inicioDoDia(alvoMs)) / DIA_MS)
}

function doisDigitos(n: number): string {
  return String(n).padStart(2, '0')
}


function formatarData(ms: number): string {
  const d = new Date(ms)
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`
}


function formatarHora(ms: number): string {
  const d = new Date(ms)
  return `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`
}


export function formatarCarimboMensagem(iso: string | null | undefined, agoraMs: number): string {
  const ms = paraMs(iso)
  if (ms === null) return ''
  const delta = agoraMs - ms
  if (delta < MINUTO_MS) return 'agora'
  if (delta < HORA_MS) return `há ${Math.floor(delta / MINUTO_MS)} min`
  return formatarHora(ms)
}


export function formatarTituloCarimbo(iso: string | null | undefined): string {
  const ms = paraMs(iso)
  if (ms === null) return ''
  return `${formatarData(ms)} ${formatarHora(ms)}`
}


export function rotuloDoDia(iso: string | null | undefined, agoraMs: number): string {
  const ms = paraMs(iso)
  if (ms === null) return ''
  const dias = diasAtras(agoraMs, ms)
  if (dias <= 0) return 'Hoje'
  if (dias === 1) return 'Ontem'
  return formatarData(ms)
}


export function mudouDeDia(
  isoAnterior: string | null | undefined,
  isoAtual: string | null | undefined,
): boolean {
  const a = paraMs(isoAnterior)
  const b = paraMs(isoAtual)
  if (a === null || b === null) return false
  return inicioDoDia(a) !== inicioDoDia(b)
}
