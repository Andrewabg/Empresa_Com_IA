
import { adiarLembrete, criarLembrete, listarAtivos, cancelarLembrete, type LembreteRow } from '@/data/lembretes'
import { getSetting } from '@/data/settings'

import { validarTz, TZ_DEFAULT } from '@/server/proativo/dispatcher'
import { formatarLembretesLista } from '@/lib/telegram/comandos'
import { fraseDaRecorrencia, type Recorrencia } from '@/lib/proativo/recorrencia'
import { dataLocalDe, ehDataDeParede, DATA_DE_TERMINO_INVALIDA } from '@/lib/rotinas/agenda'
import { AVISO_LEMBRETE_SEM_CANAL, temDestino } from '@/lib/proativo/destinoDoAviso'
import { recortarContexto } from '@/lib/proativo/contextoDoLembrete'
import { avaliarJustificativaDeRepeticao } from '@/lib/proativo/justificativaDeRepeticao'
import { getTurnContext, falasDoDonoDoTurno } from '@/server/agent/turnContext'


export const DATA_PASSADA_LEMBRETE =
  'Essa data já passou. Me diga uma data e hora no futuro que eu marco.'


export const TOLERANCIA_DUE_PASSADO_MS = 2 * 60_000


export const TERMINO_ANTES_DO_PRIMEIRO =
  'Essa data de término é antes do primeiro lembrete. Me diga uma data de término depois dele.'


export const REPETICAO_SEM_RESPALDO =
  'Marquei uma vez só, porque não achei nas suas palavras nada dizendo que isso se repete. Se era para repetir, me diga a frequência (por exemplo "todo dia" ou "toda segunda") e eu cancelo este lembrete e marco a repetição.'

export interface LembretesOpsDeps {
  criar: typeof criarLembrete
  listar: typeof listarAtivos
  cancelar: typeof cancelarLembrete
  adiar: typeof adiarLembrete
  getTz: () => Promise<string>
  now: () => string
  
  getOwnerRaw: () => Promise<string | null>
  
  ultimasMensagens: (conversationId: string) => Promise<{ papel: string; texto: string }[]>
}
export interface LembretesInput {
  acao: 'criar' | 'listar' | 'cancelar' | 'adiar'
  texto?: string; dueAt?: string; recorrencia?: Recorrencia
  
  porqueRepete?: string
  
  terminaEm?: string
  
  lembreteId?: string
}


export function confirmacaoDeCriacao(l: LembreteRow, tz: string): string {
  const quando = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: tz }).format(new Date(l.due_at))
  const abertura = `Anotado! Vou te lembrar de "${l.texto}" em ${quando}`
  if (!l.recorrencia) return `${abertura}, uma vez só, sem repetição.`
  
  
  const [ano, mes, dia] = (l.termina_em ?? '').split('-')
  const fim = l.termina_em ? `até ${dia}/${mes}/${ano}` : 'sem data para parar'
  return `${abertura} e ${fraseDaRecorrencia(l.recorrencia)} depois disso, ${fim}.`
}


export function confirmacaoDeAdiamento(l: LembreteRow, tz: string): string {
  const quando = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: tz }).format(new Date(l.due_at))
  const base = `Adiei "${l.texto}" para ${quando}`
  if (!l.recorrencia) return `${base}.`
  return `${base}, e como ele se repete, os próximos também passam a tocar nesse horário.`
}


export const ADIAR_SEM_QUANDO =
  'Para quando eu adio? Me diga a nova data e hora que eu remarco.'


export const ADIAR_NAO_ACHOU =
  'Não achei esse lembrete esperando para tocar. Ele pode já ter tocado ou ter sido cancelado. Quer que eu liste os que estão marcados?'


const RE_INDICE = /^\d{1,4}$/

export async function executarLembretes(input: LembretesInput, deps?: LembretesOpsDeps): Promise<{ ok: boolean; message: string }> {
  const d = deps ?? {
    criar: criarLembrete, listar: listarAtivos, cancelar: cancelarLembrete, adiar: adiarLembrete,
    
    getTz: async () => validarTz((await getSetting('operator_timezone')) ?? TZ_DEFAULT),
    now: () => new Date().toISOString(),
    getOwnerRaw: () => getSetting('telegram_owner_chat'),
    ultimasMensagens: async (conversationId) => {
      try {
        const { listRecentMessages } = await import('@/data/messages')
        const msgs = await listRecentMessages(conversationId, 6)
        return msgs.map((m) => ({ papel: m.role, texto: m.content ?? '' }))
      } catch { return [] }
    },
  }
  try {
    if (input.acao === 'criar') {
      if (!input.texto?.trim()) return { ok: false, message: 'Me diga O QUE lembrar.' }
      if (!input.dueAt || Number.isNaN(Date.parse(input.dueAt))) return { ok: false, message: 'Não entendi o QUANDO. Me dá data e hora (ex.: amanhã às 9h) que eu converto.' }
      
      
      
      if (Date.parse(input.dueAt) <= Date.parse(d.now()) - TOLERANCIA_DUE_PASSADO_MS) {
        return { ok: false, message: DATA_PASSADA_LEMBRETE }
      }
      
      
      
      const temCanal = temDestino(await d.getOwnerRaw())
      const tz = await d.getTz() 
      
      
      
      
      const respaldo = input.recorrencia
        ? avaliarJustificativaDeRepeticao(input.porqueRepete, falasDoDonoDoTurno())
        : null
      const recorrencia = respaldo?.justificada ? input.recorrencia : undefined
      
      
      
      
      const terminaEm = recorrencia ? (input.terminaEm?.trim() || '') : ''
      if (terminaEm) {
        if (!ehDataDeParede(terminaEm)) return { ok: false, message: DATA_DE_TERMINO_INVALIDA }
        if (terminaEm < dataLocalDe(input.dueAt, tz)) return { ok: false, message: TERMINO_ANTES_DO_PRIMEIRO }
      }
      const ctx = getTurnContext()
      const contexto = ctx.conversationId
        ? recortarContexto(await d.ultimasMensagens(ctx.conversationId))
        : ''
      const l = await d.criar({
        texto: input.texto.trim(), dueAt: input.dueAt, recorrencia,
        contexto: contexto || null, conversationId: ctx.conversationId ?? null,
        terminaEm: terminaEm || null,
      })
      const aviso = temCanal ? '' : ` ${AVISO_LEMBRETE_SEM_CANAL}`
      const semRespaldo = respaldo && !respaldo.justificada ? ` ${REPETICAO_SEM_RESPALDO}` : ''
      return { ok: true, message: `${confirmacaoDeCriacao(l, tz)}${semRespaldo}${aviso}` }
    }
    if (input.acao === 'listar') {
      
      
      const [ativos, tz] = await Promise.all([d.listar(), d.getTz()])
      return { ok: true, message: formatarLembretesLista(ativos, d.now(), tz) }
    }
    if (input.acao === 'adiar') {
      const alvo = input.lembreteId?.trim()
      if (!alvo) return { ok: false, message: 'Qual lembrete eu adio? Me diga o número dele na lista (liste antes se precisar).' }
      if (!input.dueAt || Number.isNaN(Date.parse(input.dueAt))) return { ok: false, message: ADIAR_SEM_QUANDO }
      
      
      if (Date.parse(input.dueAt) <= Date.parse(d.now()) - TOLERANCIA_DUE_PASSADO_MS) {
        return { ok: false, message: DATA_PASSADA_LEMBRETE }
      }
      let idAdiar = alvo
      if (RE_INDICE.test(alvo)) {
        const idx = Number(alvo)
        const ativos = await d.listar()
        if (idx < 1 || idx > ativos.length) return { ok: false, message: `Não achei o lembrete ${idx}. Me pede a lista de novo?` }
        idAdiar = ativos[idx - 1].id
      }
      const tzAdiar = await d.getTz()
      const linha = await d.adiar(idAdiar, input.dueAt)
      if (!linha) return { ok: false, message: ADIAR_NAO_ACHOU }
      return { ok: true, message: confirmacaoDeAdiamento(linha, tzAdiar) }
    }
    const ref = input.lembreteId?.trim()
    if (!ref) return { ok: false, message: 'Qual lembrete cancelo? Me diga o número dele na lista (liste antes se precisar).' }
    let id = ref
    if (RE_INDICE.test(ref)) {
      
      
      
      
      
      const idx = Number(ref)
      const ativos = await d.listar()
      if (idx < 1 || idx > ativos.length) return { ok: false, message: `Não achei o lembrete ${idx}. Me pede a lista de novo?` }
      id = ativos[idx - 1].id
    }
    const ok = await d.cancelar(id)
    return ok ? { ok: true, message: 'Cancelado.' } : { ok: false, message: 'Não achei esse lembrete. Quer que eu liste?' }
  } catch (err) {
    console.warn('[proativo/lembretesOps]', err)
    return { ok: false, message: 'Não consegui mexer nos lembretes agora. Tenta de novo?' }
  }
}
