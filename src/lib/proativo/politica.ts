



import { julgarInterrupcao } from './portaoDeInterrupcao'

export type PrefValor = 'imediata' | 'briefing' | 'off'
export type Decisao = 'enviar' | 'segurar_pro_briefing' | 'suprimir'
export interface NotifPrefs {
  porTipo?: Record<string, PrefValor>
  quietHours?: { inicio: string; fim: string } 
  
  respostaVoz?: boolean
}


export const DEFAULTS_POR_TIPO: Record<string, PrefValor> = {
  
  lembrete: 'imediata',              
  atendimento_escalado: 'imediata',  
  anomalia_trafego: 'imediata',      

  
  aprovacao: 'briefing',      
  tarefa_concluida: 'briefing',   
  plano_concluido: 'briefing',
  tarefa_falhou: 'briefing',  
  plano_falhou: 'briefing',
  prazo_juridico: 'briefing', 
}

export const QUIET_DEFAULT = { inicio: '22:00', fim: '07:00' }


export function minutosLocais(agoraIso: string, tz: string): number {
  const calc = (zona: string) => {
    const partes = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zona })
      .format(new Date(agoraIso)).split(':')
    const h = Number(partes[0]) % 24 
    return h * 60 + Number(partes[1])
  }
  try { return calc(tz) } catch { return calc('America/Sao_Paulo') }
}

const HORA_RE = /^\d{1,2}:\d{2}$/


export function dentroDoQuiet(agoraIso: string, tz: string, q: NotifPrefs['quietHours']): boolean {
  
  const valido = q != null && typeof q.inicio === 'string' && HORA_RE.test(q.inicio)
    && typeof q.fim === 'string' && HORA_RE.test(q.fim)
  const janela = valido ? (q as { inicio: string; fim: string }) : QUIET_DEFAULT
  const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
  const agora = minutosLocais(agoraIso, tz)
  const ini = toMin(janela.inicio); const fim = toMin(janela.fim)
  return ini > fim ? agora >= ini || agora < fim : agora >= ini && agora < fim 
}


export function minutosAteQuietComecar(agoraIso: string, tz: string, q: NotifPrefs['quietHours']): number {
  const valido = q != null && typeof q.inicio === 'string' && HORA_RE.test(q.inicio)
    && typeof q.fim === 'string' && HORA_RE.test(q.fim)
  const janela = valido ? (q as { inicio: string; fim: string }) : QUIET_DEFAULT
  const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
  const agora = minutosLocais(agoraIso, tz)
  const ini = toMin(janela.inicio)
  
  
  return ((ini - agora) % 1440 + 1440) % 1440
}

export function decidir(
  n: { tipo: string; urgencia: 'imediata' | 'briefing' },
  prefs: NotifPrefs,
  agoraIso: string,
  tz: string,
): Decisao {
  const efetiva: PrefValor = prefs.porTipo?.[n.tipo] ?? DEFAULTS_POR_TIPO[n.tipo] ?? n.urgencia
  if (efetiva === 'off') return 'suprimir'
  if (efetiva === 'briefing') return 'segurar_pro_briefing'
  
  
  
  
  
  if (n.tipo !== 'lembrete' && dentroDoQuiet(agoraIso, tz, prefs.quietHours)) return 'segurar_pro_briefing'
  return 'enviar'
}


export function decidirComPortao(
  n: { tipo: string; urgencia: 'imediata' | 'briefing'; created_at: string; payload?: Record<string, unknown> },
  prefs: NotifPrefs,
  agoraIso: string,
  tz: string,
): Decisao {
  const base = decidir(n, prefs, agoraIso, tz)
  if (base !== 'enviar') return base
  return julgarInterrupcao({ tipo: n.tipo, createdAtIso: n.created_at, payload: n.payload }, agoraIso) === 'interromper'
    ? 'enviar'
    : 'segurar_pro_briefing'
}
