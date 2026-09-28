












import { ehReasonDaBase } from './rotulosDaBase'


export function paragrafosDoMotivo(motivo: string | null | undefined): string[] {
  const t = (motivo ?? '').replace(/\r\n?/g, '\n').trim()
  if (!t) return []
  const separador = ehReasonDaBase(t) ? /\n+|\s+\|\s+/ : /\n{2,}|\s+\|\s+/
  return t
    .split(separador)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter((p) => p.length > 0)
}
