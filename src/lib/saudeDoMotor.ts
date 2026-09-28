







export const CHAVE_ULTIMO_HEARTBEAT = 'heartbeat_ultimo_at'



export const TOLERANCIA_MINIMA_MS = 15 * 60 * 1000


export const INTERVALO_HEARTBEAT_PADRAO_S = 300


const SO_DIGITOS = /^[0-9]+$/


export const INTERVALO_HEARTBEAT_MAXIMO_S = 86_400


export function intervaloDoHeartbeatS(bruto: string | undefined): number {
  if (!bruto || !SO_DIGITOS.test(bruto)) return INTERVALO_HEARTBEAT_PADRAO_S
  const n = Number(bruto)
  const dentroDaFaixa = Number.isFinite(n) && n > 0 && n <= INTERVALO_HEARTBEAT_MAXIMO_S
  return dentroDaFaixa ? n : INTERVALO_HEARTBEAT_PADRAO_S
}

export type EstadoDoMotor = 'ok' | 'parado' | 'aquecendo'

export interface EntradaSaudeDoMotor {
  
  ultimoIso: string | null
  agoraIso: string
  
  intervaloSegundos: number
  
  uptimeSegundos: number
}

export interface SaudeDoMotor {
  estado: EstadoDoMotor
  
  paradoHaMinutos: number | null
}


export function toleranciaMs(intervaloSegundos: number): number {
  const tresIntervalos = Math.max(0, intervaloSegundos) * 3 * 1000
  return Math.max(tresIntervalos, TOLERANCIA_MINIMA_MS)
}


export function saudeDoMotor(i: EntradaSaudeDoMotor): SaudeDoMotor {
  const agora = Date.parse(i.agoraIso)
  if (!Number.isFinite(agora)) return { estado: 'aquecendo', paradoHaMinutos: null }
  const tolerancia = toleranciaMs(i.intervaloSegundos)

  if (!i.ultimoIso) {
    const noArHaMs = Math.max(0, i.uptimeSegundos) * 1000
    return { estado: noArHaMs > tolerancia ? 'parado' : 'aquecendo', paradoHaMinutos: null }
  }

  const ultimo = Date.parse(i.ultimoIso)
  if (!Number.isFinite(ultimo)) return { estado: 'aquecendo', paradoHaMinutos: null }
  const atraso = agora - ultimo
  
  const minutos = Math.max(0, Math.floor(atraso / 60000))
  return { estado: atraso > tolerancia ? 'parado' : 'ok', paradoHaMinutos: minutos }
}




export interface BracoDoMotor {
  
  nome: string
  
  ultimoIso: string | null
  
  cadenciaMs: number
}

export interface BracoParado {
  nome: string
  
  paradoHaHoras: number
}


export const CADENCIAS_ATE_BRACO_PARADO = 3


export const TOLERANCIA_MINIMA_BRACO_MS = 60 * 60 * 1000


export function toleranciaDoBracoMs(cadenciaMs: number): number {
  const tres = Math.max(0, cadenciaMs) * CADENCIAS_ATE_BRACO_PARADO
  return Math.max(tres, TOLERANCIA_MINIMA_BRACO_MS)
}


export function carenciaDoBracoMs(cadenciaMs: number): number {
  return Math.max(Math.max(0, cadenciaMs), TOLERANCIA_MINIMA_BRACO_MS)
}


export function bracosParados(
  bracos: readonly BracoDoMotor[],
  contexto: { estadoDoMotor: EstadoDoMotor; agoraIso: string; uptimeSegundos: number },
): BracoParado[] {
  if (contexto.estadoDoMotor !== 'ok') return []
  const agora = Date.parse(contexto.agoraIso)
  if (!Number.isFinite(agora)) return []
  const noArHaMs = Math.max(0, contexto.uptimeSegundos) * 1000

  const parados: BracoParado[] = []
  for (const b of bracos) {
    const cadencia = Math.max(0, b.cadenciaMs)
    if (cadencia <= 0) continue
    if (noArHaMs <= carenciaDoBracoMs(cadencia)) continue
    const tolerancia = toleranciaDoBracoMs(cadencia)
    const ultimo = Date.parse((b.ultimoIso ?? '').trim())
    if (!Number.isFinite(ultimo)) continue
    const atraso = agora - ultimo
    if (atraso <= tolerancia) continue
    parados.push({ nome: b.nome, paradoHaHoras: Math.floor(atraso / 3_600_000) })
  }
  
  
  return parados.sort((a, b) => (b.paradoHaHoras - a.paradoHaHoras) || (a.nome < b.nome ? -1 : 1))
}




export const CHAVE_CONCLUSOES_DOS_BRACOS = 'heartbeat_bracos_concluidos'


export interface DefinicaoDeBraco {
  
  id: string
  
  nome: string
}


export const BRACOS_DO_MOTOR = [
  { id: 'maestro', nome: 'A execução das tarefas' },
  { id: 'memoria', nome: 'A memória da sua empresa' },
  { id: 'avisoDoLint', nome: 'O aviso sobre a organização do Cérebro' },
  { id: 'curadoria', nome: 'A fila de novas memórias' },
  { id: 'origemRecusada', nome: 'O aviso sobre memórias recusadas' },
  { id: 'promocaoPorUso', nome: 'A promoção do que você mais consulta' },
  { id: 'atendimento', nome: 'O atendimento aos seus clientes' },
  { id: 'proativo', nome: 'O envio dos seus avisos' },
  { id: 'vigilanciaTrafego', nome: 'A vigilância das suas campanhas' },
  { id: 'prazos', nome: 'O radar de prazos do jurídico' },
  { id: 'vigiado', nome: 'O aviso do que você pediu para observar' },
  { id: 'atribuicao', nome: 'A medição do resultado das campanhas' },
  { id: 'importacao', nome: 'A importação de arquivos para o Cérebro' },
  { id: 'treino', nome: 'A sala de treino' },
  { id: 'rotinas', nome: 'A execução das suas rotinas' },
  { id: 'instagram', nome: 'A automação do Instagram' },
  { id: 'fontes', nome: 'A atualização das fontes de conhecimento' },
  { id: 'entregas', nome: 'A condução das entregas do estúdio' },
  { id: 'automacaoCustom', nome: 'A automação personalizada' },
  { id: 'licenca', nome: 'A verificação da sua licença' },
  { id: 'catalogo', nome: 'A atualização da Loja' },
  { id: 'purgaContratacoes', nome: 'A limpeza das contratações antigas' },
  { id: 'podaTransicoes', nome: 'A limpeza do histórico das tarefas' },
  { id: 'podaNotificacoes', nome: 'A limpeza dos avisos antigos' },
  { id: 'podaLembretes', nome: 'A limpeza dos lembretes antigos' },
  { id: 'podaSinalDeUso', nome: 'A limpeza do registro de uso da memória' },
  { id: 'anonimizacaoCustomEnvios', nome: 'A anonimização dos envios transacionais antigos' },
  { id: 'reconcileCerebro', nome: 'A conferência do Cérebro contra o GitHub' },
  { id: 'reembedEpisodico', nome: 'A reindexação da memória de conversas' },
  { id: 'reembedBase', nome: 'A reindexação da base do atendimento' },
  { id: 'sincroniaCerebro', nome: 'A checagem da conexão com o GitHub' },
  { id: 'reindexCerebro', nome: 'A reconstrução do índice do Cérebro' },
] as const satisfies readonly DefinicaoDeBraco[]


export type IdDeBraco = (typeof BRACOS_DO_MOTOR)[number]['id']

export interface RegistroDeConclusoes {
  
  emIso: string | null
  
  porBraco: Record<string, string>
}


export function lerConclusoesDosBracos(bruto: string | null | undefined): RegistroDeConclusoes {
  const vazio: RegistroDeConclusoes = { emIso: null, porBraco: {} }
  if (!bruto || !bruto.trim()) return vazio
  let cru: unknown
  try { cru = JSON.parse(bruto) } catch { return vazio }
  if (!cru || typeof cru !== 'object' || Array.isArray(cru)) return vazio
  const obj = cru as { em?: unknown; bracos?: unknown }
  const emIso = typeof obj.em === 'string' && obj.em.trim() ? obj.em : null
  const porBraco: Record<string, string> = {}
  if (obj.bracos && typeof obj.bracos === 'object' && !Array.isArray(obj.bracos)) {
    for (const [id, marca] of Object.entries(obj.bracos as Record<string, unknown>)) {
      if (typeof marca === 'string' && marca.trim()) porBraco[id] = marca
    }
  }
  return { emIso, porBraco }
}


export function mesclarConclusoesDosBracos(
  bruto: string | null | undefined,
  concluidosAgora: Readonly<Record<string, string | undefined>>,
  emIso: string,
  idsConhecidos: readonly string[] = BRACOS_DO_MOTOR.map((b) => b.id),
): string {
  const anterior = lerConclusoesDosBracos(bruto).porBraco
  const bracos: Record<string, string> = {}
  for (const id of idsConhecidos) {
    const agora = concluidosAgora[id]
    const marca = typeof agora === 'string' && agora.trim() ? agora : anterior[id]
    if (marca) bracos[id] = marca
  }
  return JSON.stringify({ em: emIso, bracos })
}


export function bracosDoMotor(
  registro: RegistroDeConclusoes,
  intervaloSegundos: number,
  agoraIso: string,
  definicoes: readonly DefinicaoDeBraco[] = BRACOS_DO_MOTOR,
): BracoDoMotor[] {
  const cadenciaMs = Math.max(0, intervaloSegundos) * 1000
  if (cadenciaMs <= 0) return []
  const agora = Date.parse(agoraIso)
  const em = Date.parse((registro.emIso ?? '').trim())
  if (!Number.isFinite(agora) || !Number.isFinite(em)) return []
  if (agora - em > toleranciaDoBracoMs(cadenciaMs)) return []
  return definicoes.map((d) => ({
    nome: d.nome,
    ultimoIso: registro.porBraco[d.id] ?? null,
    cadenciaMs,
  }))
}


function ha(horas: number): string {
  if (horas >= 48) return `há ${Math.floor(horas / 24)} dias`
  if (horas <= 1) return 'há 1 hora'
  return `há ${horas} horas`
}


export const NOMES_NO_AVISO_DE_BRACO = 3


export function avisoDeBracoParado(bracos: readonly BracoParado[]): string | null {
  if (!bracos.length) return null
  const mostrados = bracos.slice(0, NOMES_NO_AVISO_DE_BRACO)
  const lista = mostrados.map((b) => `${b.nome} não roda ${ha(b.paradoHaHoras)}`).join('; ')
  const restantes = bracos.length - mostrados.length
  const eMais = restantes > 0 ? `, e mais ${restantes} ${restantes === 1 ? 'parte' : 'partes'}` : ''
  const abertura = bracos.length === 1 ? 'uma parte dele parou' : 'algumas partes dele pararam'
  return `O trabalho automático da sua empresa está rodando, mas ${abertura}: ${lista}${eMais}. O resto continua normal. Abra Configuração para conferir o servidor.`
}


export function avisoDeMotorParado(paradoHaMinutos: number | null): string {
  const quando =
    paradoHaMinutos === null
      ? 'desde que esta instalação subiu'
      : paradoHaMinutos >= 120
        ? `há mais de ${Math.floor(paradoHaMinutos / 60)} horas`
        : `há ${Math.max(1, paradoHaMinutos)} minutos`
  return `O trabalho automático da sua empresa está parado ${quando}. Enquanto isso, rotinas não rodam, mensagens de clientes ficam na fila e os avisos do Telegram não saem. Abra Configuração para conferir o servidor.`
}
