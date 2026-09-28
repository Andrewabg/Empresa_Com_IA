
export interface BriefAberto { id: string; titulo: string; pendentes: string[] }

export function designBriefsDirective(briefs: BriefAberto[]): string {
  if (!briefs.length) return ''
  const linhas = briefs.map((b) => {
    const falta = b.pendentes.length ? ` — ainda falta: ${b.pendentes.join(', ')}` : ' — pronto pra gerar'
    return `- "${b.titulo}" (pecaId ${b.id})${falta}`
  }).join('\n')
  return [
    'BRIEF(S) EM ABERTO (peça aguardando você gerar o anúncio):',
    linhas,
    'Conduza o briefing: pergunte UMA lacuna por vez, calorosa, e grave a resposta com `atualizarBrief` (pecaId + o campo). Quando o operador mandar gerar (e o essencial estiver preenchido), chame `gerarCriativo` com o pecaId ACIMA — não pergunte qual.',
    'ESTA LISTA NÃO PRENDE VOCÊ. Se o operador pedir uma arte DIFERENTE das acima (outro produto, outra campanha, outro assunto), abra um brief NOVO com `iniciarBriefing` e conduza esse — nunca force o pedido novo pra dentro de um brief velho, e nunca responda que já existe um briefing em andamento como se fosse impedimento. Só retome um brief acima quando o operador falar dele.',
  ].join('\n')
}
