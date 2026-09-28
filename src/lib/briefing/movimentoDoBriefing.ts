
import { alertavel } from '@/lib/juridico/prazosRadar'
import type { PrazoView } from '@/lib/juridico/prazosTipos'


export interface PrazoComCriacao {
  prazo: PrazoView
  criadoEm: string
}


export function diaAnterior(diaIso: string): string {
  const t = Date.parse(`${diaIso}T12:00:00Z`)
  if (!Number.isFinite(t)) return diaIso
  return new Date(t - 86_400_000).toISOString().slice(0, 10)
}


export function prazoEntrouNaJanela(
  i: PrazoComCriacao,
  hojeIso: string,
  ontemIso: string,
  desdeIso: string,
): boolean {
  if (!alertavel(i.prazo, hojeIso)) return false 
  if (!alertavel(i.prazo, ontemIso)) return true 
  const criado = Date.parse(i.criadoEm)
  const desde = Date.parse(desdeIso)
  if (!Number.isFinite(criado) || !Number.isFinite(desde)) return false
  return criado >= desde 
}


export function contarPrazosQueEntraramNaJanela(
  prazos: PrazoComCriacao[],
  hojeIso: string,
  desdeIso: string,
): number {
  const ontem = diaAnterior(hojeIso)
  return prazos.filter((p) => prazoEntrouNaJanela(p, hojeIso, ontem, desdeIso)).length
}
