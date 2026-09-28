






const LIMIAR_CURTA = 18


const GATILHOS_RECALL = new Set([
  
  'qual', 'quais', 'quanto', 'quantos', 'quanta', 'quantas',
  'quem', 'quando', 'onde', 'cade', 'como', 'porque', 'pq',
  
  'mostra', 'lista', 'busca', 'procura', 'consulta',
  
  'cnpj', 'cpf', 'valor', 'preco', 'prazo', 'data',
  'endereco', 'telefone', 'email', 'e-mail', 'nome',
  'contrato', 'nota', 'boleto', 'saldo', 'pix', 'conta',
  
  'orcamento', 'proposta', 'campanha', 'oferta', 'anuncio', 'criativo',
  'copy', 'roas', 'cpl', 'cac', 'ltv', 'lead', 'funil',
  'clausula', 'honorario', 'fatura', 'comissao', 'ticket',
  'publico', 'nicho', 'persona', 'meta', 'relatorio', 'briefing', 'publico-alvo',
  
  'monta', 'monte', 'cria', 'crie', 'gera', 'gere',
  'analisa', 'analise', 'calcula', 'calcule',
  'prepara', 'prepare', 'revisa', 'revise',
  'escreve', 'escreva', 'resume', 'resuma',
  
  
  
  
  'lembra', 'lembrar', 'lembro', 'lembrei', 'lembrete',
  'esqueci', 'esqueceu', 'esquecer',
  'combinamos', 'combinado', 'falamos', 'conversamos', 'disse', 'dissemos', 'falou',
  'ontem', 'anteontem', 'semana', 'mes', 'passada', 'passado',
  'retoma', 'retomar', 'retomando', 'continua', 'continuar', 'continuando',
  'aquilo', 'aquele', 'aquela', 'daquilo',
  
  
  
  
  
  
  'lembrou', 'lembrava', 'lembrando', 'lembraram',
  'esqueceram', 'esquecia', 'esquecendo',
  'combinei', 'combinou',
  'conversei', 'conversou', 'conversaram',
  'falei', 'falaram',
  'disseram',
])


export const MARCADORES_DE_RETOMADA: ReadonlySet<string> = new Set([
  
  
  'esse', 'essa', 'esses', 'essas', 'aqueles', 'aquelas',
  'desse', 'dessa', 'desses', 'dessas', 'nesse', 'nessa', 'nesses', 'nessas',
  'daquele', 'daquela', 'daqueles', 'daquelas', 'naquele', 'naquela',
  
  'outro', 'outra', 'outros', 'outras', 'mesmo', 'mesma', 'mesmos', 'mesmas',
  
  'primeiro', 'primeira', 'segundo', 'segunda', 'terceiro', 'terceira', 'ultimo', 'ultima',
  'anterior', 'seguinte', 'proximo', 'proxima', 'acima', 'abaixo',
  
  'dele', 'dela', 'deles', 'delas', 'nele', 'nela', 'neles', 'nelas',
])


export const MARCADORES_BIGRAMA: ReadonlySet<string> = new Set(['de baixo', 'de cima', 'de antes'])


const GATILHOS_BIGRAMA = new Set(['me da', 'qual e', 'quais sao', 'a gente', 'da ultima'])


function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}


function tokensDe(texto: string): string[] {
  return semAcento(texto.toLowerCase()).split(/[^a-z0-9-]+/).filter(Boolean)
}


export function temMarcadorDeRetomada(texto: string): boolean {
  const tokens = tokensDe(texto)
  for (const tok of tokens) {
    if (MARCADORES_DE_RETOMADA.has(tok)) return true
  }
  for (let i = 0; i < tokens.length - 1; i++) {
    if (MARCADORES_BIGRAMA.has(`${tokens[i]} ${tokens[i + 1]}`)) return true
  }
  return false
}


function temGatilhoConsulta(norm: string): boolean {
  const tokens = tokensDe(norm)
  for (const tok of tokens) {
    if (GATILHOS_RECALL.has(tok)) return true
  }
  for (let i = 0; i < tokens.length - 1; i++) {
    if (GATILHOS_BIGRAMA.has(`${tokens[i]} ${tokens[i + 1]}`)) return true
  }
  return temMarcadorDeRetomada(norm)
}


const FATICAS = new Set([
  'ok', 'okay', 'sim', 'não', 'nao', 'blz', 'beleza', 'valeu', 'vlw',
  'obrigado', 'obrigada', 'pode', 'manda', 'faz', 'isso', 'isso aí', 'isso ai',
  'aham', 'uhum', 'hum', 'tá', 'ta', 'tá bom', 'ta bom', 'tá bem', 'ta bem',
  'show', 'top', 'boa', 'legal', 'certo', 'claro', 'perfeito', 'ótimo', 'otimo',
  'massa', 'tranquilo', 'de boa', 'pode ser', 'é isso', 'eh isso',
  'vai', 'bora', 'feito', 'fechou', 'fechado', 'combinado', 'entendi', 'sei',
  'um segundo', 'so um segundo', 'só um segundo', 'na mesma',
])


export function precisaRecall(texto: string): boolean {
  const t = texto.trim()
  if (!t) return false
  if (t.includes('?')) return true
  const norm = t.toLowerCase().replace(/[\s.,;:!…~]+$/, '')
  if (FATICAS.has(norm)) return false
  if (/^k+$/.test(norm) || /^(ha)+$/.test(norm) || /^rs+$/.test(norm)) return false 
  if (temGatilhoConsulta(norm)) return true
  if (t.length <= LIMIAR_CURTA) return false
  return true
}


export function turnoFactualSemGrounding(texto: string, recallBlock: string | undefined | null): boolean {
  return precisaRecall(texto) && !recallBlock
}
