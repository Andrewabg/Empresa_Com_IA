

import { notificar, type NotificarInput } from './notificar'
import { citar } from '@/lib/proativo/render'
import { montarRetornoConselheiro } from '@/lib/proativo/retornoConselheiro'
import { avisoSemResposta } from '@/lib/canais/semResposta'
import { TEXTOS_CONEXAO } from '@/lib/instagram/saudeDoToken'
import { carregarNomesDeAgente } from '@/server/aprovacoes/nomesDeAgente'
import { agentName } from '@/lib/brain-nav'
import { encurtarTitulo } from '@/lib/encurtarTitulo'
import { terminouSemResposta, AVISO_TAREFA_SEM_RESPOSTA } from '@/lib/tarefas/desfecho'
import { fusoDoDonoMemoizado } from '@/server/config/fusoDoDonoMemo'
import type { Approval } from '@/data/approvals'

export interface ProducerDeps {
  notificarFn?: (i: NotificarInput) => Promise<{ created: boolean }>
  
  nomesDeAgente?: () => Promise<Record<string, string>>
  
  hojeLocal?: () => Promise<string>
}



const KIND_HUMANO: Record<string, string> = {
  tool_action: 'ação externa', brain_pr: 'mudança no Cérebro', plan: 'plano de orquestração',
  custom_tool: 'tool personalizada', directive: 'regra durável',
}

export async function notificarAprovacao(a: Approval, deps: ProducerDeps = {}): Promise<void> {
  const fn = deps.notificarFn ?? notificar
  try {
    
    
    
    const nomes = await (deps.nomesDeAgente ?? carregarNomesDeAgente)()
    const quem = a.agent ? agentName(a.agent, nomes) : 'um agente'
    
    
    
    
    const motivo = (a.reason ?? '').trim()
    const corpo = [
      `**${quem}** pediu sua aprovação.`,
      `Tipo: ${KIND_HUMANO[a.kind] ?? a.kind}`,
      ...(motivo ? ['**Por que estão pedindo**', citar(motivo)] : []),
    ].join('\n\n')
    await fn({
      tipo: 'aprovacao', urgencia: 'imediata',
      titulo: `Aprovação pendente: ${a.title ?? KIND_HUMANO[a.kind] ?? a.kind}`,
      corpo,
      payload: { approval_id: a.id },
      dedupKey: `aprovacao:${a.id}`,
    })
  } catch (err) { console.warn('[proativo/producers] notificarAprovacao fail-open:', err) }
}

export async function notificarEscalacao(
  i: {
    contatoNome: string; motivo: string; conversaId: string
    
    resumo?: string
    sentimento?: 'neutro' | 'insatisfeito' | 'irritado'
  },
  deps: ProducerDeps = {},
): Promise<void> {
  const fn = deps.notificarFn ?? notificar
  try {
    
    
    const alerta = i.sentimento === 'irritado' ? '⚠️ Cliente irritado. ' : ''
    const corpo = [
      `**${i.contatoNome}** quer falar com você. Motivo: ${i.motivo}`,
      i.resumo ? `${alerta}${i.resumo}` : alerta.trim(),
      'A conversa está em espera no /inbox.',
    ].filter((l) => l.trim()).join('\n')
    const hoje = deps.hojeLocal
      ? await deps.hojeLocal()
      : new Intl.DateTimeFormat('en-CA', { timeZone: await fusoDoDonoMemoizado() }).format(new Date())
    await fn({
      tipo: 'atendimento_escalado', urgencia: 'imediata',
      titulo: `${i.contatoNome} pediu um humano`,
      corpo,
      payload: { conversa_id: i.conversaId },
      
      
      
      
      
      
      dedupKey: `escalacao:${i.conversaId}:${hoje}`,
    })
  } catch (err) { console.warn('[proativo/producers] notificarEscalacao fail-open:', err) }
}


export async function notificarCanalDesconectado(
  i: { rotulo: string; canalId: string }, deps: ProducerDeps = {},
): Promise<void> {
  const fn = deps.notificarFn ?? notificar
  try {
    const nome = i.rotulo.trim() || 'WhatsApp'
    await fn({
      tipo: 'canal_desconectado', urgencia: 'imediata',
      titulo: `Canal caiu: ${nome}`,
      corpo: `O WhatsApp "${nome}" perdeu a conexão e parou de responder. Reconecte lendo o QR de novo em Config › Canais.`,
      payload: { canal_id: i.canalId },
    })
  } catch (err) { console.warn('[proativo/producers] notificarCanalDesconectado fail-open:', err) }
}



export const TITULO_CONEXAO_IG: Record<'caiu' | 'credencial', string> = {
  caiu: 'Instagram parou de avisar',
  credencial: 'O acesso do Instagram não vale mais',
}

export async function notificarConexaoInstagram(
  i: { rotulo: string; canalId: string; estado: 'caiu' | 'credencial' }, deps: ProducerDeps = {},
): Promise<void> {
  const fn = deps.notificarFn ?? notificar
  try {
    const nome = i.rotulo.trim() || 'Instagram'
    const corpo = TEXTOS_CONEXAO[i.estado]
    const titulo = `${TITULO_CONEXAO_IG[i.estado]}: ${nome}`
    await fn({
      tipo: 'instagram_conexao', urgencia: 'imediata',
      titulo, corpo,
      payload: { canal_id: i.canalId },
    })
  } catch (err) { console.warn('[proativo/producers] notificarConexaoInstagram fail-open:', err) }
}


export async function notificarQualidadeRuim(
  i: { rotulo: string; canalId: string; conselho: string }, deps: ProducerDeps = {},
): Promise<void> {
  const fn = deps.notificarFn ?? notificar
  try {
    const nome = i.rotulo.trim() || 'WhatsApp'
    await fn({
      tipo: 'canal_qualidade_ruim', urgencia: 'imediata',
      titulo: `Qualidade do número caiu: ${nome}`,
      corpo: `A Meta rebaixou a qualidade do WhatsApp "${nome}" para VERMELHO. ${i.conselho}`,
      payload: { canal_id: i.canalId },
    })
  } catch (err) { console.warn('[proativo/producers] notificarQualidadeRuim fail-open:', err) }
}


export async function notificarAtendimentoSemResposta(
  i: { contatoNome: string; conversaId: string },
  deps: ProducerDeps = {},
): Promise<void> {
  const fn = deps.notificarFn ?? notificar
  try {
    
    
    const { titulo, corpo } = avisoSemResposta(i.contatoNome)
    await fn({
      tipo: 'atendimento_sem_resposta', urgencia: 'imediata',
      titulo, corpo,
      payload: { conversa_id: i.conversaId },
    })
  } catch (err) { console.warn('[proativo/producers] notificarAtendimentoSemResposta fail-open:', err) }
}


export function deveNotificarTarefa(
  t: { id: string; parent_task_id: string | null; plan_id: string | null; objective: string },
  status: 'done' | 'failed' | 'cancelled',
  resultado: string | undefined,
  agenteNome: string,
): NotificarInput | null {
  if (t.parent_task_id || t.plan_id) return null 
  if (status === 'cancelled') return null
  
  
  const semResposta = terminouSemResposta(status, resultado)
  const { titulo, corpo } = montarRetornoConselheiro({
    agenteNome,
    objetivo: t.objective,
    resultado: semResposta ? AVISO_TAREFA_SEM_RESPOSTA : resultado ?? '',
    status: semResposta ? 'failed' : status,
  })
  if (status === 'failed' || semResposta) {
    return { tipo: 'tarefa_falhou', urgencia: 'imediata', titulo, corpo, payload: { task_id: t.id }, dedupKey: `tarefa:${t.id}:failed` }
  }
  return { tipo: 'tarefa_concluida', urgencia: 'imediata', titulo, corpo, payload: { task_id: t.id }, dedupKey: `tarefa:${t.id}:done` }
}


export async function notificarMemoriaEscaladaPorPush(
  i: { contexto?: string; ref?: string } = {}, deps: ProducerDeps = {},
): Promise<void> {
  const fn = deps.notificarFn ?? notificar
  try {
    const alvo = i.contexto ? ` (${i.contexto})` : ''
    await fn({
      tipo: 'memoria_escalada', urgencia: 'imediata',
      titulo: 'Uma memória ficou esperando no repositório',
      corpo: `Não consegui gravar uma memória${alvo} direto no Cérebro e ela foi para um Pull Request no repositório. Não consegui abrir o pedido no painel para você decidir por lá desta vez, então ela está esperando no GitHub.`,
      ...(i.ref ? { payload: { pr_ref: i.ref } } : {}),
      
      
      ...(i.contexto ? { dedupKey: `memoria_escalada:${i.contexto}` } : {}),
    })
  } catch (err) { console.warn('[proativo/producers] notificarMemoriaEscaladaPorPush fail-open:', err) }
}

export async function notificarPlanoTerminal(
  i: { planId: string; objetivo: string; status: 'done' | 'failed'; sintese: string }, deps: ProducerDeps = {},
): Promise<void> {
  const fn = deps.notificarFn ?? notificar
  try {
    const objetivo = encurtarTitulo(i.objetivo, 80) 
    await fn(i.status === 'done'
      ? { tipo: 'plano_concluido', urgencia: 'briefing', titulo: `Plano concluído: ${objetivo}`, corpo: i.sintese.slice(0, 400), payload: { plan_id: i.planId }, dedupKey: `plano:${i.planId}:done` }
      : { tipo: 'plano_falhou', urgencia: 'imediata', titulo: `Plano travou: ${objetivo}`, corpo: i.sintese.slice(0, 400), payload: { plan_id: i.planId }, dedupKey: `plano:${i.planId}:failed` })
  } catch (err) { console.warn('[proativo/producers] notificarPlanoTerminal fail-open:', err) }
}
