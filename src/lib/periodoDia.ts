







export type PeriodoDia = 'manha' | 'tarde' | 'noite'


export function periodoDaHora(hourLocal: number): PeriodoDia {
  if (hourLocal < 12) return 'manha'
  if (hourLocal < 18) return 'tarde'
  return 'noite'
}


export function horaLocal(now: Date, timezone: string): number {
  const raw = Number(
    new Intl.DateTimeFormat('en', { hour: 'numeric', hour12: false, timeZone: timezone }).format(now),
  )
  return raw === 24 ? 0 : raw
}


export function periodoDaTz(now: Date, timezone: string): PeriodoDia {
  return periodoDaHora(horaLocal(now, timezone))
}
