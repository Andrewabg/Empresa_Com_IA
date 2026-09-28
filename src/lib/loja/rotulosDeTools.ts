














import type { AgentTools } from '@/data/agents'


type FlagDeTool = {
  [K in keyof AgentTools]-?: boolean extends AgentTools[K] ? K : never
}[keyof AgentTools]


export const ROTULOS_DE_TOOL: Record<FlagDeTool, string | null> = {
  
  buscarCerebro: 'Buscar no Cérebro',
  buscarConversas: 'Buscar em conversas antigas',
  lerAcervo: 'Ler e listar notas do Cérebro',
  proporMemoria: 'Propor memórias',
  rascunharMemoria: 'Rascunhar memórias',
  registrarConhecimento: 'Registrar conhecimento',
  anotarAprendizado: 'Aprende ao trabalhar',
  registrarDiretriz: 'Receber regras duráveis',
  proporConhecimentoAtendimento: 'Alimentar a base do atendimento',

  
  composio: 'Ações externas',
  emitirArtefato: 'Emitir artefato',
  gerarImagem: 'Gerar imagem',

  
  contratarAgente: 'Contratar especialistas',
  delegarTarefa: 'Delegar tarefas',
  planejarObjetivo: 'Planejar objetivos da empresa',
  detalharFuncionario: 'Consultar o organograma',
  consultarFuncionario: 'Perguntar a outro cargo',
  transferir: 'Encaminhar para outro cargo',
  gerenciarRotinas: 'Cuidar do trabalho recorrente',
  gerenciarLembretes: 'Guardar lembretes',
  vigilanciaDeclarada: 'Vigiar o que os clientes dizem',
  ajustarNotificacoes: 'Ajustar os avisos',
  ajustarEstilo: 'Aprende o seu jeito de falar',

  
  painelTrafego: 'Painel de Tráfego',
  proporAcaoMeta: 'Ações no Meta Ads',
  investigacao: 'Leituras livres da Meta e cálculos na bancada',
  estudioCopy: 'Estúdio de copy',
  estudioDesign: 'Estúdio visual',
  escritorioJuridico: 'Escritório jurídico',
  painelInstagram: 'Automações do Instagram',
  
  
  painelGoogle: 'Análise de Google Ads',

  
  
  
  
  proporAcaoGoogle: null,
  
  
  registrarEntrevista: null,
  adiarEntrevista: null,
}


export const TOOL_LABELS: Partial<Record<keyof AgentTools, string>> = Object.fromEntries(
  Object.entries(ROTULOS_DE_TOOL).filter(([, v]) => v !== null),
) as Partial<Record<keyof AgentTools, string>>


export function rotuloDeTool(chave: string): string {
  return TOOL_LABELS[chave as keyof AgentTools] ?? chave
}
