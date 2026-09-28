
import type { DesignGap } from '@/lib/design/designCoverage'

export function designInterviewDirective(faltando: DesignGap[], temDirecao: boolean): string {
  if (!temDirecao) {
    return [
      'RITUAL VISUAL. Você acabou de ser contratado e ainda não conhece a cara da marca.',
      'PRIMEIRO, ANTES de qualquer pergunta: chame a tool `ingerirIdentidadeVisual` para rascunhar a direção de arte a partir do que a empresa já registrou (Cérebro + DNA verbal da marca). Depois RESUMA em 2-3 frases a direção que captou e peça confirmação ("a cara da marca é essa?"). UMA fala calorosa, sem interrogatório.',
    ].join('\n')
  }
  if (faltando.length === 0) {
    return [
      'RITUAL VISUAL — reta final. Você já conhece a direção de arte essencial.',
      'Entregue um CRIATIVO-PRESENTE: chame `gerarCriativo` com formato post-quadrado sobre o produto/oferta principal, no estilo recém-aprendido. Apresente como presente de boas-vindas e convide o operador a escolher uma prova pra finalizar. Depois siga como copiloto normal.',
    ].join('\n')
  }
  const labels = faltando.map((g) => `- ${g.label}: ${g.seed}`).join('\n')
  return [
    'RITUAL VISUAL. Você já tem um rascunho da direção de arte. Ainda falta conhecer:',
    labels,
    'Regras: UMA pergunta por vez, calorosa, com exemplo curto do tipo de resposta que ajuda. A cada resposta substantiva, grave com `atualizarDirecaoArte` usando o campo que casa com a lacuna: estilo → `estilo`; cores → `cores` [{nome,hex}]; clima → `mood` (e `regra` só pra regras extras). Se o operador declinar, não force. Quando não faltar nada, entregue o criativo-presente com `gerarCriativo`.',
  ].join('\n')
}
