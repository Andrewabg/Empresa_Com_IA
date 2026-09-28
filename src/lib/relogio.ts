


import { TZ_DEFAULT, validarTz } from '@/lib/tempo/fusoDoDono'


export const TZ_FALLBACK = TZ_DEFAULT


export function tzSegura(tz: string | null | undefined): string {
  return tz ? validarTz(tz) : TZ_FALLBACK
}


export function blocoRelogio(nowIso: string, tz: string): string {
  const minutoUtc = `${nowIso.slice(0, 16)}Z` 
  const legivel = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short', timeZone: tz }).format(new Date(nowIso))
  return `Contexto de tempo (não repita ao usuário): agora é ${legivel}, fuso ${tz} (UTC de referência: ${minutoUtc}). ` +
    'Converta expressões relativas de tempo do usuário ("em 2 minutos", "amanhã às 9h") usando ESTE relógio — ' +
    'em gerenciarLembretes, calcule o dueAt ISO-8601 com offset você mesmo, sem pedir a hora ao usuário.'
}


type ParteConteudo = { type: string; text?: string }


export function comContextoNaUltimaMsg<T extends { role: string; content: string | ParteConteudo[] }>(msgs: T[], contexto: string): T[] {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]
    if (m.role !== 'user') continue
    const copia = [...msgs]
    if (typeof m.content === 'string') {
      copia[i] = { ...m, content: `${m.content}\n\n[${contexto}]` }
      return copia
    }
    const partes = [...m.content]
    let anexado = false
    for (let j = partes.length - 1; j >= 0; j--) {
      const p = partes[j]
      if (p.type === 'text' && typeof p.text === 'string') {
        partes[j] = { ...p, text: `${p.text}\n\n[${contexto}]` }
        anexado = true
        break
      }
    }
    if (!anexado) partes.push({ type: 'text', text: `[${contexto}]` })
    copia[i] = { ...m, content: partes }
    return copia
  }
  return msgs
}
