



















import { campoSeguro, copyDoModeloSaneada } from '@/lib/fontes/sanitizar'
import { resumoDoLedger, type Ledger } from './ledger'


const TETO_DA_NOTA = 1_500


function dataHoraCurta(iso: string, tz: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return iso
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(ms))
  const pegar = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '00'
  return `${pegar('day')}/${pegar('month')} ${pegar('hour')}:${pegar('minute')}`
}


export function pluralizar(n: number, singular: string, formaPlural: string): string {
  return n === 1 ? singular : formaPlural
}


export function rotuloDoEventoDeInvestigacao(r: { leituras: number; cruzamentos: number; minutos: number }): string {
  const leituras = pluralizar(r.leituras, 'leitura', 'leituras')
  const cruzamentos = pluralizar(r.cruzamentos, 'cruzamento', 'cruzamentos')
  return `${r.leituras} ${leituras} · ${r.cruzamentos} ${cruzamentos} · ${r.minutos} min`
}


export function textoDaNotaDaInvestigacao(l: Ledger, agoraISO: string, tz: string): string {
  const agoraMs = Date.parse(agoraISO)
  const r = resumoDoLedger(l, Number.isFinite(agoraMs) ? agoraMs : 0)
  const leituras = pluralizar(r.leituras, 'leitura', 'leituras')
  const cruzamentos = pluralizar(r.cruzamentos, 'cruzamento', 'cruzamentos')
  let texto = `Investigação de ${dataHoraCurta(agoraISO, tz)}: ${r.leituras} ${leituras}, ${r.cruzamentos} ${cruzamentos}.`
  const firmes = l.firme.map((f) => copyDoModeloSaneada(campoSeguro(f))).filter(Boolean)
  if (firmes.length > 0) texto += ` Firme: ${firmes.join('; ')}.`
  return [...texto].slice(0, TETO_DA_NOTA).join('')
}
