


const DICIONARIO: Record<string, string> = {
  
  buscar: 'search', busca: 'search', procurar: 'search', procura: 'search',
  achar: 'search', encontrar: 'search', pesquisar: 'search',
  
  listar: 'list', liste: 'list', lista: 'list', enumerar: 'list',
  
  ler: 'get', leia: 'get', obter: 'get', pegar: 'get', mostrar: 'get',
  ver: 'get', abrir: 'get', consultar: 'get', baixar: 'download',
  
  enviar: 'send', mandar: 'send', responder: 'reply', encaminhar: 'forward',
  criar: 'create', cria: 'create', adicionar: 'add', agendar: 'schedule',
  atualizar: 'update', editar: 'update', alterar: 'update', mudar: 'update',
  apagar: 'delete', deletar: 'delete', excluir: 'delete', remover: 'remove',
  pausar: 'pause', ativar: 'activate', duplicar: 'duplicate', mover: 'move',
  compartilhar: 'share', comentar: 'comment', marcar: 'mark',

  
  evento: 'event', eventos: 'event',
  agenda: 'calendar', calendario: 'calendar', compromisso: 'event', compromissos: 'event',
  email: 'email', emails: 'email', mensagem: 'message', mensagens: 'message',
  caixa: 'inbox', rascunho: 'draft', anexo: 'attachment',
  arquivo: 'file', arquivos: 'file', pasta: 'folder', pastas: 'folder',
  planilha: 'spreadsheet', planilhas: 'spreadsheet', celula: 'cell', aba: 'sheet',
  documento: 'document', documentos: 'document', texto: 'text',
  pagina: 'page', paginas: 'page', bloco: 'block', banco: 'database',
  contato: 'contact', contatos: 'contact', tarefa: 'task', tarefas: 'task',
  campanha: 'campaign', campanhas: 'campaign', anuncio: 'ad', anuncios: 'ad',
  publico: 'audience', orcamento: 'budget', criativo: 'creative',
  
  relatorio: 'report insights', desempenho: 'performance insights', metricas: 'insights',
  resultado: 'insights', resultados: 'insights', gasto: 'spend', conversao: 'conversion',
  alcance: 'reach', clique: 'click', cliques: 'click', impressoes: 'impression',
  card: 'card', quadro: 'board', canal: 'channel', comentario: 'comment',
}


function normalizar(token: string): string {
  return token.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}


export function expandirConsultaFerramenta(consulta: string): string {
  const original = consulta.trim()
  if (!original) return ''

  const tokens = original.split(/[\s\-_.,;:!?()[\]{}'"]+/).filter(Boolean)
  
  const jaPresentes = new Set(tokens.map(normalizar))

  const acrescentar: string[] = []
  for (const token of tokens) {
    const traducao = DICIONARIO[normalizar(token)]
    if (!traducao) continue
    for (const termo of traducao.split(' ')) {
      if (jaPresentes.has(termo)) continue
      jaPresentes.add(termo)
      acrescentar.push(termo)
    }
  }

  return acrescentar.length ? `${original} ${acrescentar.join(' ')}` : original
}
