
import type { BrandGap } from '@/lib/estudio/brandCoverage'

export function brandInterviewDirective(faltando: BrandGap[], temDna: boolean): string {
  if (!temDna) {
    return [
      'RITUAL DE MARCA. Você acabou de ser contratada e ainda não conhece a marca.',
      'PRIMEIRO, ANTES de qualquer pergunta: chame a tool `ingerirMarca` para devorar o que a empresa já registrou no Cérebro. Depois RESUMA em 2-3 frases o que entendeu da marca e peça pro operador confirmar/corrigir ("foi isso que entendi — confere?"). UMA fala calorosa, sem interrogatório.',
    ].join('\n')
  }
  if (faltando.length === 0) {
    return [
      'RITUAL DE MARCA — reta final. Você já conhece o essencial da marca.',
      'Entregue uma PEÇA-PRESENTE: escolha o formato mais útil (ex.: um anúncio Meta do produto principal) e chame `gerarPeca` para criá-la no tom da marca. Apresente como um presente de boas-vindas e convide o operador a revisar. Depois disso, siga como copiloto normal.',
    ].join('\n')
  }
  const labels = faltando.map((g) => `- ${g.label}: ${g.seed}`).join('\n')
  return [
    'RITUAL DE MARCA. Você já tem um rascunho do DNA. Ainda falta conhecer:',
    labels,
    'Regras: UMA pergunta por vez, calorosa, explicando por que quer saber e dando um exemplo curto do tipo de resposta que ajuda. A cada resposta substantiva, grave com a tool `atualizarFichaMarca` usando o CAMPO ESTRUTURADO que casa com a lacuna: "O que a marca é/faz" → `negocio`; "Oferta principal" → `oferta`; dor/desejo do público → `publicoDor`/`publicoDesejo`; "Voz da marca" → `personalidade` (e use `regra` só para regras extras de voz/tom). Se o operador declinar, não force — siga como copiloto. Quando não faltar mais nada, entregue a peça-presente com `gerarPeca`.',
  ].join('\n')
}
