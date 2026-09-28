
const PALETTE = ['alloy', 'ash', 'ballad', 'cedar', 'coral', 'echo', 'marin', 'sage', 'shimmer', 'verse'] as const


export type TimbreVoz = 'masculina' | 'feminina' | 'neutra'

export interface VozOpcao {
  id: string
  
  label: string
  timbre: TimbreVoz
  
  descricao: string
}


export const VOZES: readonly VozOpcao[] = [
  { id: 'ash', label: 'Ash', timbre: 'masculina', descricao: 'Grave e firme — autoridade calma.' },
  { id: 'ballad', label: 'Ballad', timbre: 'masculina', descricao: 'Quente e expressiva, com pausa.' },
  { id: 'cedar', label: 'Cedar', timbre: 'masculina', descricao: 'Clara e natural — conversa de igual pra igual.' },
  { id: 'echo', label: 'Echo', timbre: 'masculina', descricao: 'Seca e direta, sem floreio.' },
  { id: 'verse', label: 'Verse', timbre: 'masculina', descricao: 'Jovem e ágil, ritmo rápido.' },
  { id: 'coral', label: 'Coral', timbre: 'feminina', descricao: 'Acolhedora e articulada — bom padrão de atendimento.' },
  { id: 'marin', label: 'Marin', timbre: 'feminina', descricao: 'Serena e clara, cadência tranquila.' },
  { id: 'shimmer', label: 'Shimmer', timbre: 'feminina', descricao: 'Leve e enérgica, tom otimista.' },
  { id: 'sage', label: 'Sage', timbre: 'neutra', descricao: 'Sóbria e equilibrada — pouca cor.' },
  { id: 'alloy', label: 'Alloy', timbre: 'neutra', descricao: 'Padrão da casa: plana e previsível.' },
] as const


export const TIMBRES: readonly TimbreVoz[] = ['masculina', 'feminina', 'neutra'] as const


export function isVozValida(v: unknown): v is string {
  return typeof v === 'string' && VOZES.some((o) => o.id === v)
}


export function vozInfo(id: string | null | undefined): VozOpcao | null {
  if (!id) return null
  return VOZES.find((o) => o.id === id) ?? null
}


export const VOZ_NAO_FALA = 'nao_fala'


export const MSG_AGENTE_SEM_VOZ =
  'Este agente está configurado para não falar. Em Agentes, na parte de Voz, você pode escolher uma voz para ele.'


export const MSG_SEM_VOZ_NA_SALA = 'Este agente responde só por texto. Você pode dar uma voz a ele em Agentes.'


export const MSG_COMPOSITOR_SEM_VOZ = 'Este agente responde só por texto. Enter para enviar.'


export const MSG_SALVO_COM_VOZ = '✓ salvo, vale na próxima conversa por voz'
export const MSG_SALVO_SEM_VOZ = '✓ salvo, este agente não fala mais'

export interface EscolhaDeVoz {
  
  voice?: string | null
  desligada: boolean
}


export function escolhaDeVoz(valor: string): EscolhaDeVoz {
  
  if (valor === VOZ_NAO_FALA) return { desligada: true }
  
  if (isVozValida(valor)) return { voice: valor, desligada: false }
  return { voice: null, desligada: false }
}


export function descricaoDaVozGuardada(voice: string | null | undefined): string {
  const info = vozInfo(voice)
  if (!info) return 'Este agente responde só por texto. O microfone não aparece na conversa com ele.'
  return `Este agente responde só por texto. A voz ${info.label} fica guardada: escolha ela de novo para ele voltar a falar.`
}


export function valorDoSelect(voice: string | null, desligada: boolean): string {
  if (desligada) return VOZ_NAO_FALA
  return voice ?? ''
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0
}

export function voiceForAgent(agentId: string, isPrimary: boolean, defaultVoice: string): string {
  if (isPrimary) return defaultVoice
  return PALETTE[fnv1a(agentId) % PALETTE.length]
}
