
import {
  listarAtivas as listarAtivasDefault,
  listarTodas as listarTodasDefault,
  criarIntencao as criarIntencaoDefault,
  cancelarIntencao as cancelarIntencaoDefault,
  registrarDisparo as registrarDisparoDefault,
  marcarExpirada as marcarExpiradaDefault,
  type IntencaoRow, type CriarIntencaoInput, type FonteIntencao,
} from '@/data/intencoes'
import { listMensagensInboundDesde as listMensagensDefault, type MensagemExternaRow } from '@/data/mensagensExternas'
import {
  casaGatilho, podeDisparar, estadoAposDisparo, chaveDedupIntencao, calcularExpiracao,
  dentroDaJanelaDaIntencao, TIPO_VIGILANCIA_DECLARADA, type EstadoIntencao,
} from '@/lib/vigilancia/intencaoPermanente'
import { notificar as notificarDefault, type NotificarInput } from './notificar'
import { temDestino } from '@/lib/proativo/destinoDoAviso'
import { getSetting, setSetting } from '@/data/settings'




export const CHAVE_CURSOR_VIGILANCIA = 'vigilancia_declarada_desde'

export interface VigilanciaDeclaradaDeps {
  listarAtivas?: (fonte: FonteIntencao) => Promise<IntencaoRow[]>
  listarMensagens?: (desdeIso: string) => Promise<MensagemExternaRow[]>
  registrarDisparo?: (id: string, disparosEsperados: number, novoEstado: EstadoIntencao, agoraIso: string) => Promise<boolean>
  marcarExpirada?: (id: string) => Promise<void>
  notificarFn?: (i: NotificarInput) => Promise<{ created: boolean }>
  temCanal?: () => Promise<boolean>
  now?: () => string
  getCursor?: () => Promise<string | null>
  setCursor?: (iso: string) => Promise<void>
}

export interface VigilanciaDeclaradaResultado {
  disparados: number
  expiradas: number
}

export async function runVigilanciaDeclarada(
  deps: VigilanciaDeclaradaDeps = {},
): Promise<VigilanciaDeclaradaResultado> {
  const listarAtivas = deps.listarAtivas ?? listarAtivasDefault
  const listarMensagens = deps.listarMensagens ?? listMensagensDefault
  const registrarDisparo = deps.registrarDisparo ?? registrarDisparoDefault
  const marcarExpirada = deps.marcarExpirada ?? marcarExpiradaDefault
  const notificarFn = deps.notificarFn ?? notificarDefault
  const temCanal = deps.temCanal ?? (async () => temDestino(await getSetting('telegram_owner_chat')))
  const now = deps.now ?? (() => new Date().toISOString())
  const getCursor = deps.getCursor ?? (() => getSetting(CHAVE_CURSOR_VIGILANCIA))
  const setCursor = deps.setCursor ?? ((iso: string) => setSetting(CHAVE_CURSOR_VIGILANCIA, iso))

  const out: VigilanciaDeclaradaResultado = { disparados: 0, expiradas: 0 }

  try {
    const agora = now()
    
    
    
    
    
    const ancorarESair = async (): Promise<VigilanciaDeclaradaResultado> => {
      try { await setCursor(agora) } catch (e) { console.warn('[vigilanciaDeclarada] cursor (passada ociosa) fail-open:', e) }
      return out
    }

    
    if (!(await temCanal())) return ancorarESair()

    let intencoes: IntencaoRow[]
    
    
    try { intencoes = await listarAtivas('atendimento') }
    catch (e) { console.warn('[vigilanciaDeclarada] listarAtivas fail-open:', e); return out }
    if (!intencoes.length) return ancorarESair()

    
    
    
    
    
    
    
    
    
    
    const cursorAnterior = await getCursor().catch(() => null)
    const desde = cursorAnterior ?? agora
    if (cursorAnterior === null) {
      try { await setCursor(agora) } catch (e) { console.warn('[vigilanciaDeclarada] cursor (bootstrap) fail-open:', e) }
    }
    let mensagens: MensagemExternaRow[]
    try { mensagens = await listarMensagens(desde) }
    catch (e) { console.warn('[vigilanciaDeclarada] listarMensagens fail-open:', e); return out }

    for (const i of intencoes) {
      try {
        if (i.expira_em && Date.parse(i.expira_em) < Date.parse(agora)) {
          await marcarExpirada(i.id)
          out.expiradas++
          continue
        }
        
        
        
        
        
        
        const achou = mensagens.find(
          (m) => dentroDaJanelaDaIntencao(i.created_at, m.created_at) && casaGatilho(m.texto, i.palavras, i.modo_casamento),
        )
        if (!achou) continue
        if (!podeDisparar(i, agora).pode) continue

        const novoEstado = estadoAposDisparo(i)
        const claimed = await registrarDisparo(i.id, i.disparos, novoEstado, agora)
        if (!claimed) continue 

        const hoje = agora.slice(0, 10)
        const r = await notificarFn({
          tipo: TIPO_VIGILANCIA_DECLARADA, urgencia: 'imediata',
          titulo: 'Uma vigilância que você pediu aconteceu',
          corpo: `Chegou uma mensagem de cliente que bate com o que você me pediu para vigiar: "${i.descricao}". Abra o Inbox para ver a conversa.`,
          payload: { intencao_id: i.id },
          dedupKey: chaveDedupIntencao(i.id, hoje),
        })
        if (r.created) out.disparados++
      } catch (e) { console.warn('[vigilanciaDeclarada] intenção falhou (fail-open):', i.id, e) }
    }

    
    
    if (mensagens.length) {
      const maisRecente = mensagens[mensagens.length - 1].created_at
      try { await setCursor(maisRecente) } catch (e) { console.warn('[vigilanciaDeclarada] cursor fail-open:', e) }
    }

    return out
  } catch (e) {
    console.warn('[vigilanciaDeclarada] fail-open:', e)
    return out
  }
}





export const FONTE_NAO_SUPORTADA =
  'Hoje só consigo vigiar o que chega no atendimento, ou seja, mensagens de clientes. Ainda não vigio tarefa terminando, mudança no Cérebro nem métrica de campanha.'
export const PALAVRAS_OBRIGATORIAS =
  'Me diga uma palavra ou frase que, aparecendo na mensagem do cliente, deve disparar o aviso.'
export const SEM_CANAL_VIGILANCIA =
  'Posso guardar o pedido, mas ainda não tenho por onde te avisar quando acontecer. Conecte o Telegram em Configuração e eu ligo essa vigilância.'

export interface VigilanciaInput {
  acao: 'criar' | 'listar' | 'cancelar'
  descricao?: string
  palavras?: string[]
  
  fonte?: FonteIntencao
  
  vigilanciaId?: string
}

export interface VigilanciaOpsDeps {
  criar: (i: CriarIntencaoInput) => Promise<IntencaoRow>
  listar: () => Promise<IntencaoRow[]>
  cancelar: (id: string) => Promise<boolean>
  now: () => string
  
  getOwnerRaw: () => Promise<string | null>
}

function defaultOpsDeps(): VigilanciaOpsDeps {
  return {
    criar: criarIntencaoDefault, listar: listarTodasDefault, cancelar: cancelarIntencaoDefault,
    now: () => new Date().toISOString(),
    getOwnerRaw: () => getSetting('telegram_owner_chat'),
  }
}


function rotuloEstado(i: IntencaoRow): string {
  if (i.estado === 'disparada') return 'avisou o máximo de vezes combinado'
  if (i.estado === 'expirada') return 'venceu'
  return `ativa (${i.disparos}/${i.max_disparos} avisos)`
}

const RE_INDICE = /^\d{1,4}$/

export async function executarVigilancia(
  input: VigilanciaInput,
  ctx?: { actingAgentId?: string | null; operatorId?: string | null },
  deps?: VigilanciaOpsDeps,
): Promise<{ ok: boolean; message: string }> {
  const d = deps ?? defaultOpsDeps()
  try {
    if (input.acao === 'listar' || input.acao === 'cancelar') {
      
      
      const visiveis = (await d.listar()).filter((i) => i.estado !== 'cancelada')

      if (input.acao === 'listar') {
        if (!visiveis.length) return { ok: true, message: 'Nenhuma vigilância criada ainda.' }
        return {
          ok: true,
          message: visiveis.map((i, idx) => `${idx + 1}. ${i.descricao} — ${rotuloEstado(i)}`).join('\n'),
        }
      }

      const ref = input.vigilanciaId?.trim()
      if (!ref || !RE_INDICE.test(ref)) {
        return { ok: false, message: 'Qual vigilância cancelo? Me diga o número dela na lista (liste antes se precisar).' }
      }
      const idx = Number(ref)
      if (idx < 1 || idx > visiveis.length) {
        return { ok: false, message: `Não achei a vigilância ${idx}. Me pede a lista de novo?` }
      }
      const ok = await d.cancelar(visiveis[idx - 1].id)
      return ok ? { ok: true, message: 'Cancelada.' } : { ok: false, message: 'Não achei essa vigilância. Quer que eu liste?' }
    }

    
    const fonte = input.fonte ?? 'atendimento'
    if (fonte !== 'atendimento') return { ok: false, message: FONTE_NAO_SUPORTADA }

    const descricao = input.descricao?.trim()
    if (!descricao) return { ok: false, message: 'Me diga o que devo vigiar, em uma frase.' }

    const palavras = (input.palavras ?? []).map((p) => p.trim()).filter(Boolean)
    if (!palavras.length) return { ok: false, message: PALAVRAS_OBRIGATORIAS }

    
    
    if (!temDestino(await d.getOwnerRaw())) return { ok: false, message: SEM_CANAL_VIGILANCIA }

    const agora = d.now()
    await d.criar({
      agentId: ctx?.actingAgentId ?? 'jarvis',
      operatorId: ctx?.operatorId ?? null,
      descricao, fonte, palavras,
      expiraEm: calcularExpiracao(agora),
    })
    return {
      ok: true,
      message: 'Vigilância criada. Aviso assim que uma mensagem de cliente bater com isso, no máximo 3 vezes, com 24 horas entre um aviso e outro. Vale por 90 dias.',
    }
  } catch (err) {
    console.warn('[proativo/vigilanciaDeclarada] ops falhou (fail-open):', err)
    return { ok: false, message: 'Não consegui mexer nas vigilâncias agora. Tenta de novo?' }
  }
}
