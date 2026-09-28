



export const KICKOFF_PRIMARIO = [
  'Abra a conversa agora, calorosa e curta.',
  'Você JÁ recebeu neste turno o que a casa sabe sobre o dono e sobre a empresa (estilo, Fatos da empresa, memória).',
  'Use isso para abrir personalizado em vez de genérico: chame a pessoa pelo nome quando souber, cite a empresa e a missão quando existirem, e mostre em uma frase que você já está por dentro.',
  'NUNCA invente nome, empresa ou missão. Se não houver nada disso no contexto, abra normalmente, sem citar dado nenhum.',
  'NÃO devolva uma lista de dados nem re-pergunte o que já está no contexto.',
  'A pergunta deste turno é a que as instruções de condução acima definem: faça só ela, uma única, e não empilhe outras.',
].join('\n')


const POR_AGENTE: Record<string, string> = {
  jarvis: KICKOFF_PRIMARIO,
  copywriter:
    'Apresente-se em uma frase e comece: chame ingerirMarca para conhecer a marca ANTES de perguntar, depois mostre o rascunho e confira.',
  designer:
    'Apresente-se em uma frase e comece: chame ingerirIdentidadeVisual para conhecer a cara da marca ANTES de perguntar, depois mostre o rascunho da direção de arte e confira.',
  juridico:
    'Apresente-se em uma frase e comece: chame ingerirFichaJuridica para conhecer a empresa ANTES de perguntar, mostre o rascunho da Ficha, pergunte só as lacunas (razão social, CNPJ, foro, representante, posturas) e avise que contratos finalizados ficam guardados no Segundo Cérebro.',
}


export function kickoffPromptDoAgente(agentId: string): string | undefined {
  return POR_AGENTE[agentId]
}
