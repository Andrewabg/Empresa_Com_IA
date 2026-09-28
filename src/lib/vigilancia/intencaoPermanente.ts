

export type ModoCasamento = 'contem' | 'exata' | 'exata_normalizada'
export type EstadoIntencao = 'ativa' | 'disparada' | 'expirada' | 'cancelada'

export const ORCAMENTO_DISPAROS = 3
export const COOLDOWN_HORAS = 24
export const EXPIRA_DIAS = 90


export const TIPO_VIGILANCIA_DECLARADA = 'vigilancia_declarada'

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    
    
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}


function escapar(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}


export function casaGatilho(texto: string, palavras: string[], modo: ModoCasamento): boolean {
  const alvo = normalizar(texto)
  const lista = palavras.map(normalizar).filter(Boolean)
  if (!lista.length) return false
  if (modo === 'exata') return lista.includes(alvo)
  if (modo === 'exata_normalizada') return lista.includes(alvo.replace(/[^a-z0-9 ]+/g, '').trim())
  return lista.some((p) => new RegExp(`(?:^|\\s)${escapar(p)}(?:\\s|$)`, 'u').test(alvo))
}

export interface IntencaoParaDisparo {
  estado: EstadoIntencao
  disparos: number
  max_disparos: number
  ultimo_disparo_em: string | null
  expira_em: string | null
}

const HORA_MS = 3_600_000
const DIA_MS = 24 * HORA_MS

export function podeDisparar(i: IntencaoParaDisparo, agoraIso: string): { pode: boolean; motivo?: string } {
  if (i.estado !== 'ativa') return { pode: false, motivo: 'A vigilância não está ativa.' }
  if (i.disparos >= i.max_disparos) return { pode: false, motivo: 'Já avisei o número de vezes combinado.' }
  const agora = Date.parse(agoraIso)
  if (i.expira_em && Date.parse(i.expira_em) < agora) return { pode: false, motivo: 'A vigilância venceu.' }
  if (i.ultimo_disparo_em) {
    const desde = agora - Date.parse(i.ultimo_disparo_em)
    if (Number.isFinite(desde) && desde < COOLDOWN_HORAS * HORA_MS) {
      return { pode: false, motivo: 'Avisei há pouco; espero antes de avisar de novo.' }
    }
  }
  return { pode: true }
}


export function estadoAposDisparo(i: Pick<IntencaoParaDisparo, 'disparos' | 'max_disparos'>): EstadoIntencao {
  return i.disparos + 1 >= i.max_disparos ? 'disparada' : 'ativa'
}


export function dentroDaJanelaDaIntencao(
  nascimentoIso: string | null | undefined,
  mensagemIso: string | null | undefined,
): boolean {
  const nascimento = Date.parse(nascimentoIso ?? '')
  const mensagem = Date.parse(mensagemIso ?? '')
  if (!Number.isFinite(nascimento) || !Number.isFinite(mensagem)) return false
  return mensagem >= nascimento
}


export function chaveDedupIntencao(intencaoId: string, diaISO: string): string {
  return `${TIPO_VIGILANCIA_DECLARADA}:${intencaoId}:${diaISO}`
}


export function calcularExpiracao(agoraIso: string): string {
  return new Date(Date.parse(agoraIso) + EXPIRA_DIAS * DIA_MS).toISOString()
}
