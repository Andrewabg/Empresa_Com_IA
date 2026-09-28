
import type { HiringCoverage, HiringTopic } from './coverage'
import type { HiringMode } from './brief'


const LABEL: Record<HiringTopic, string> = {
  missao: 'missao — papel do agente, o que ele faz e como é o resultado bem feito',
  ferramentas: 'ferramentas — que apps/serviços ele usa (resolver e conectar) OU confirmação explícita de que não precisa',
  fronteiras: 'fronteiras — o que ele NUNCA pode fazer OU aceite do padrão (todo write pede aprovação)',
}


export const TURN_CAP = 40


const TURN_CAP_NUDGE =
  'AVISO: esta conversa já ficou longa. Em UMA frase gentil, sugira ao dono resumir o essencial agora (ou recomeçar do zero) para não se alongar demais — sem pressioná-lo.'


export function hiringDirective(cov: HiringCoverage, mode: HiringMode, turnos = 0): string {
  const cabeca = mode === 'revisao'
    ? 'REVISÃO DE AGENTE (entrevista). O agente já existe; você está colhendo ajustes.'
    : 'ENTREVISTA DE CONTRATAÇÃO (modo ativo). Você é o RH; conduza uma conversa calorosa e objetiva.'
  const nudge = turnos >= TURN_CAP ? [TURN_CAP_NUDGE] : []
  if (cov.done) {
    if (mode === 'revisao') {
      return [
        cabeca,
        'O agente já está completo. NÃO gere um candidato ainda: pergunte, em 1 frase, o que o dono quer AJUSTAR (missão, ferramentas, fronteiras).',
        'Registre cada ajuste com registrarBrief / resolverFerramentas. SÓ chame gerarCandidato DEPOIS que o dono pedir uma mudança concreta — nunca sem um ajuste pedido.',
        ...nudge,
      ].join('\n')
    }
    return [
      cabeca,
      'Cobertura COMPLETA. Confirme em 1 frase o que entendeu e chame a tool gerarCandidato para apresentar o candidato.',
      'Não invente novos requisitos; não chame gerarCandidato duas vezes sem o aluno pedir ajuste.',
      ...nudge,
    ].join('\n')
  }
  const faltam = cov.missing.map((t) => `- ${LABEL[t]}`).join('\n')
  return [
    cabeca,
    'Tópicos que AINDA FALTAM cobrir (registre cada resposta com a tool registrarBrief):',
    faltam,
    'Regras: UMA pergunta por vez, sem interrogatório. Quando o aluno citar apps/serviços, chame resolverFerramentas.',
    'NUNCA invente integração: se resolverFerramentas não achar, seja honesto e registre como indisponivel.',
    'NÃO chame gerarCandidato ainda — o trilho recusa enquanto faltar tópico.',
    ...nudge,
  ].join('\n')
}
