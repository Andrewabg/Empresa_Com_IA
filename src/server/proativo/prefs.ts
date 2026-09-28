

import { getSetting as getDefault, setSetting as setDefault } from '@/data/settings'
import type { NotifPrefs, PrefValor } from '@/lib/proativo/politica'
import { DEFAULTS_POR_TIPO } from '@/lib/proativo/politica'
import { TIPO_AVISO_LINT_ACERVO } from '@/lib/brain/lintDoAcervo'
import { TIPO_AVISO_ORIGEM_RECUSADA } from '@/server/brain/candidatasElegiveis'
import { podeAlgumDiaInterromper } from '@/lib/proativo/portaoDeInterrupcao'

export interface PrefsDeps { getSetting: typeof getDefault; setSetting: typeof setDefault }
export interface AjusteInput {
  porTipo?: Record<string, PrefValor>
  quietHours?: { inicio: string; fim: string }
  briefingHora?: string
  
  respostaVoz?: boolean
  
  tetoDiario?: number
}
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/


function erroTetoInvalido(v: number): string {
  
  
  
  
  const valor = Number.isFinite(v) ? `"${v}"` : 'esse valor'
  return `Teto inválido: ${valor}. Use um número inteiro de 1 para cima.`
}
function resumoTetoDiario(v: number): string {
  
  
  return v === 1 ? 'no máximo 1 interrupção por dia' : `no máximo ${v} interrupções por dia`
}


function resumoPorTipo(tipo: string, valor: PrefValor): string {
  if (valor === 'imediata' && !podeAlgumDiaInterromper(tipo)) {
    return `${tipo}: continua indo só para o resumo diário, esse aviso não interrompe na hora mesmo pedindo "imediata" (é assim por desenho). Se quiser ver agora, mande /briefing.`
  }
  return `${tipo} → ${valor}`
}

const VALORES_VALIDOS: PrefValor[] = ['imediata', 'briefing', 'off']

const TIPOS_SEM_DEFAULT = [TIPO_AVISO_LINT_ACERVO, TIPO_AVISO_ORIGEM_RECUSADA]
const TIPOS_VALIDOS = [...Object.keys(DEFAULTS_POR_TIPO), ...TIPOS_SEM_DEFAULT]

export async function aplicarAjusteNotificacoes(input: AjusteInput, deps?: PrefsDeps): Promise<{ ok: boolean; resumo: string }> {
  const d = deps ?? { getSetting: getDefault, setSetting: setDefault }
  
  const temAlgo = input.briefingHora || input.quietHours || input.respostaVoz !== undefined || (input.porTipo && Object.keys(input.porTipo).length > 0) || input.tetoDiario !== undefined
  if (!temAlgo) return { ok: true, resumo: 'Nada a ajustar.' }

  if (input.briefingHora && !RE_HORA.test(input.briefingHora)) return { ok: false, resumo: `Hora inválida: "${input.briefingHora}" (use HH:MM).` }
  if (input.quietHours && (!RE_HORA.test(input.quietHours.inicio) || !RE_HORA.test(input.quietHours.fim))) {
    return { ok: false, resumo: 'Quiet hours inválidas (use HH:MM).' }
  }
  
  
  if (input.porTipo) {
    const chavesInvalidas = Object.keys(input.porTipo).filter((k) => !TIPOS_VALIDOS.includes(k))
    if (chavesInvalidas.length > 0) {
      return { ok: false, resumo: `Tipo(s) desconhecido(s): ${chavesInvalidas.join(', ')}. Tipos válidos: ${TIPOS_VALIDOS.join(', ')}.` }
    }
    const valoresInvalidos = Object.entries(input.porTipo).filter(([, v]) => !VALORES_VALIDOS.includes(v))
    if (valoresInvalidos.length > 0) {
      return { ok: false, resumo: `Valor(es) inválido(s): ${valoresInvalidos.map(([k, v]) => `${k}="${v}"`).join(', ')}. Valores válidos: ${VALORES_VALIDOS.join(', ')}.` }
    }
    
    
    
    
    
    
    
    
    if (input.porTipo.aprovacao === 'off') {
      return { ok: false, resumo: 'Não posso desligar os avisos de APROVAÇÃO por aqui, porque é a sua supervisão. Se realmente quiser mudar isso, faça em /config.' }
    }
  }
  if (input.tetoDiario !== undefined
    && (!Number.isInteger(input.tetoDiario) || input.tetoDiario < 1)) {
    return { ok: false, resumo: erroTetoInvalido(input.tetoDiario) }
  }
  let atual: NotifPrefs = {}
  try { const raw = await d.getSetting('notificacao_prefs'); atual = raw ? JSON.parse(raw) : {} } catch {  }
  const novo: NotifPrefs = {
    ...atual,
    ...(input.porTipo ? { porTipo: { ...atual.porTipo, ...input.porTipo } } : {}),
    ...(input.quietHours ? { quietHours: input.quietHours } : {}),
    ...(input.respostaVoz !== undefined ? { respostaVoz: input.respostaVoz } : {}),
  }
  await d.setSetting('notificacao_prefs', JSON.stringify(novo))
  if (input.briefingHora) await d.setSetting('briefing_push_hora', input.briefingHora)
  if (input.tetoDiario !== undefined) await d.setSetting('proativo_teto_diario', String(input.tetoDiario))
  const partes: string[] = []
  if (input.porTipo) partes.push(Object.entries(input.porTipo).map(([t, v]) => resumoPorTipo(t, v)).join(', '))
  if (input.quietHours) partes.push(`silêncio ${input.quietHours.inicio}–${input.quietHours.fim}`)
  if (input.briefingHora) partes.push(`briefing às ${input.briefingHora}`)
  if (input.respostaVoz !== undefined) partes.push(`resposta em voz ${input.respostaVoz ? 'ligada' : 'desligada'}`)
  if (input.tetoDiario !== undefined) partes.push(resumoTetoDiario(input.tetoDiario))
  return { ok: true, resumo: `Ajustado: ${partes.join('; ')}.` }
}
