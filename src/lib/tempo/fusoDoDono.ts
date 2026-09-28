


export const FUSO_SETTING_KEY = 'operator_timezone'


export const TZ_DEFAULT = 'America/Sao_Paulo'


export function ehFusoValido(tz: string): boolean {
  if (!tz.trim()) return false
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz })
    return true
  } catch {
    return false
  }
}


export function validarTz(tz: string): string {
  return ehFusoValido(tz) ? tz : TZ_DEFAULT
}
