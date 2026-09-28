


export const CHAVE_SEM_CANAL = 'proativo_sem_canal_desde'


export const AVISO_LEMBRETE_SEM_CANAL =
  'Ainda não tenho por onde te avisar na hora, mas deixo o lembrete marcado: quando chegar a hora ele aparece no seu painel, e conectando o Telegram em Configuração o aviso passa a chegar direto no seu celular.'


export const AVISO_ROTINA_SEM_CANAL =
  'Ainda não tenho canal para te avisar na hora, mas crio a rotina mesmo assim: o resultado aparece em Tarefas. Conecte o Telegram em Configuração para o aviso chegar direto.'


export function temDestino(ownerRaw: string | null): boolean {
  if (!ownerRaw || !ownerRaw.trim()) return false
  try {
    const o = JSON.parse(ownerRaw) as { chatId?: unknown }
    return typeof o?.chatId === 'string' && o.chatId.trim().length > 0
  } catch {
    return false
  }
}

const DIA_MS = 86_400_000


export const CONVITE_A_CONECTAR_TELEGRAM =
  'Conecte o Telegram em Configuração e eles passam a chegar no seu celular na hora.'


export function tituloDaFilaPresa(total: number, desdeIso: string | null, agoraIso: string): string {
  const desde = desdeIso ? Date.parse(desdeIso) : NaN
  const agora = Date.parse(agoraIso)
  const dias = Number.isFinite(desde) && Number.isFinite(agora)
    ? Math.floor(Math.max(0, agora - desde) / DIA_MS)
    : null
  const n = Number.isFinite(total) ? Math.floor(total) : 0
  const quantos =
    n <= 0 ? 'Existem avisos esperando' :
    n === 1 ? '1 aviso esperando' :
    `${n} avisos esperando`
  const quando =
    dias === null ? '' :
    dias >= 2 ? ` há ${dias} dias` :
    dias === 1 ? ' há 1 dia' :
    ' desde hoje'
  return `${quantos}${quando}`
}
