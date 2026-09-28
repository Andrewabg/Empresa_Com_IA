
import type { PrazoView } from '@/lib/juridico/prazosTipos'
import { classificarPrazo } from '@/lib/juridico/prazosRadar'

export const TIPO_PRAZO = 'prazo_juridico'


function balde(hojeISO: string, vencido: boolean): string {
  if (!vencido) return hojeISO
  const dias = Math.floor(Date.parse(`${hojeISO}T00:00:00Z`) / 86_400_000)
  return `semana-${Math.floor(dias / 7)}`
}


export function chaveDedupPrazo(prazoId: string, hojeISO: string, vencido: boolean): string {
  return `${TIPO_PRAZO}:${prazoId}:${balde(hojeISO, vencido)}`
}


export function chaveDedupPrazoAgregado(hojeISO: string, vencido: boolean): string {
  return `${TIPO_PRAZO}:agregado:${balde(hojeISO, vencido)}`
}


function limpo(campo: string | null | undefined, fallback: string): string {
  const c = (campo ?? '').replace(/\s+/g, ' ').trim()
  return c || fallback
}

function quando(dias: number): string {
  if (dias < 0) return dias === -1 ? 'venceu ontem' : `venceu há ${Math.abs(dias)} dias`
  if (dias === 0) return 'vence hoje'
  if (dias === 1) return 'vence amanhã'
  return `vence em ${dias} dias`
}

export function avisoDePrazo(prazo: PrazoView, dias: number): { titulo: string; corpo: string } {
  const nome = limpo(prazo.titulo, 'Um prazo do jurídico')
  return {
    titulo: `Prazo: ${nome}`,
    corpo: `${nome} ${quando(dias)} (${prazo.dataAlvo}). Abra o Jurídico para ver o que precisa ser feito.`,
  }
}


export function avisoDeVariosPrazos(prazos: PrazoView[], hojeISO: string): { titulo: string; corpo: string } {
  const linhas = prazos.map((p) => {
    const nome = limpo(p.titulo, 'Um prazo do jurídico')
    const { diasRestantes } = classificarPrazo(p, hojeISO)
    return `• ${nome}: ${quando(diasRestantes)} (${p.dataAlvo})`
  })
  return {
    titulo: `${prazos.length} prazos do jurídico pedem atenção`,
    corpo: `Estes prazos estão na janela de aviso:\n\n${linhas.join('\n')}\n\nAbra o Jurídico para ver o que precisa ser feito em cada um.`,
  }
}
