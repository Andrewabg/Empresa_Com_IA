
import type { PropostaPrazo } from '@/lib/juridico/prazosTipos'

export function somarMeses(dataISO: string, n: number): string {
  const [y, m, d] = dataISO.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1 + n, 1))
  const ultimoDia = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate()
  const dia = Math.min(d, ultimoDia)
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dia).padStart(2, '0')
  return `${base.getUTCFullYear()}-${mm}-${dd}`
}

export function parseVigenciaMeses(texto: string): number | null {
  const m = texto.match(/(\d{1,3})\s*\(?[^)]*\)?\s*mes(?:es)?/i)
  return m ? Number(m[1]) : null
}

export function montarPrazosDerivados(a: { dataAssinatura: string | null; vigenciaMeses: number | null; avisoDias: number }): PropostaPrazo[] {
  if (!a.dataAssinatura || !a.vigenciaMeses) return []
  const fim = somarMeses(a.dataAssinatura, a.vigenciaMeses)
  return [
    { tipo: 'renovacao', titulo: 'Renovação automática', dataAlvo: fim, janelaDias: a.avisoDias },
    { tipo: 'expiracao', titulo: 'Fim de vigência', dataAlvo: fim, janelaDias: a.avisoDias },
  ]
}
