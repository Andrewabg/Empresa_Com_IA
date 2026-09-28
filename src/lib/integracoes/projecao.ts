

import { matchAliases, normalizarTermo } from '@/lib/hiring/toolkit-aliases'


export interface ToolkitConnectionLike {
  slug: string; name: string; connected: boolean
  requiredBy?: string[]; icon?: string; category?: string
  
  categoryName?: string
  
  destaque?: boolean
  
  descricao?: string
  
  semAuth?: boolean
}


export interface IntegracaoCard {
  slug: string; name: string; icon?: string; category?: string
  categoriaLabel?: string   
  connected: boolean
  usadaPor: string[]   
  
  destaque?: boolean
  
  descricao?: string
  
  semAuth?: boolean
}

export function projetarIntegracaoCard(tk: ToolkitConnectionLike): IntegracaoCard {
  return {
    slug: tk.slug,
    name: tk.name,
    ...(tk.icon ? { icon: tk.icon } : {}),
    ...(tk.category ? { category: tk.category } : {}),
    ...(tk.category ? { categoriaLabel: rotulo(tk.category, tk.categoryName) } : {}),
    connected: tk.connected,
    usadaPor: tk.requiredBy ?? [],
    ...(tk.destaque ? { destaque: true } : {}),
    ...(tk.descricao ? { descricao: tk.descricao } : {}),
    ...(tk.semAuth ? { semAuth: true } : {}),
  }
}

export interface SecaoIntegracao { titulo: string; cards: IntegracaoCard[] }






const CATEGORIA_LABEL: Record<string, string> = {
  
  ads: 'Marketing', marketing: 'Marketing',
  email: 'Comunicação', communication: 'Comunicação', comunicacao: 'Comunicação',
  crm: 'Vendas & CRM', vendas: 'Vendas & CRM',
  dev: 'Desenvolvimento', 'developer-tools': 'Desenvolvimento',
  produtividade: 'Produtividade', productivity: 'Produtividade',
  dados: 'Dados & Analytics', analytics: 'Dados & Analytics',
  financeiro: 'Financeiro', social: 'Redes sociais', atendimento: 'Atendimento',
  
  accounting: 'Contabilidade',
  'ads & conversion': 'Anúncios & Conversão',
  'ai agents': 'Agentes de IA',
  'ai assistants': 'Assistentes de IA',
  'ai chatbots': 'Chatbots de IA',
  'ai document extraction': 'Extração de Documentos com IA',
  'ai meeting assistants': 'Assistentes de Reunião com IA',
  'ai models': 'Modelos de IA',
  'ai sales tools': 'Ferramentas de Vendas com IA',
  'ai web scraping': 'Web Scraping com IA',
  'app builder': 'Criação de Apps',
  'artificial intelligence': 'Inteligência Artificial',
  'bookmark managers': 'Gerenciadores de Favoritos',
  'business intelligence': 'Business Intelligence',
  commerce: 'Comércio',
  'contact management': 'Gestão de Contatos',
  'customer support': 'Atendimento ao Cliente',
  databases: 'Bancos de Dados',
  'developer tools & devops': 'Ferramentas de Dev & DevOps',
  documents: 'Documentos',
  'drip emails': 'E-mails Automáticos',
  ecommerce: 'E-commerce',
  education: 'Educação',
  'email newsletters': 'Newsletters',
  'event management': 'Gestão de Eventos',
  'file management & storage': 'Arquivos & Armazenamento',
  'forms & surveys': 'Formulários & Pesquisas',
  fundraising: 'Arrecadação',
  gaming: 'Games',
  'hr talent & recruitment': 'Talentos & Recrutamento',
  'human resources': 'Recursos Humanos',
  'images & design': 'Imagens & Design',
  'internet of things': 'Internet das Coisas',
  'it operations': 'Operações de TI',
  'marketing automation': 'Automação de Marketing',
  'model context protocol': 'Model Context Protocol',
  'news & lifestyle': 'Notícias & Lifestyle',
  notes: 'Notas',
  notifications: 'Notificações',
  'online courses': 'Cursos Online',
  'payment processing': 'Pagamentos',
  'phone & sms': 'Telefone & SMS',
  'product management': 'Gestão de Produtos',
  'project management': 'Gestão de Projetos',
  'proposal & invoice management': 'Propostas & Faturas',
  reviews: 'Avaliações',
  'sales & crm': 'Vendas & CRM',
  'scheduling & booking': 'Agendamento',
  'security & identity tools': 'Segurança & Identidade',
  'server monitoring': 'Monitoramento de Servidores',
  signatures: 'Assinaturas',
  'social media accounts': 'Redes Sociais',
  'social media marketing': 'Marketing em Redes Sociais',
  spreadsheets: 'Planilhas',
  'task management': 'Gestão de Tarefas',
  'team chat': 'Chat de Equipe',
  'team collaboration': 'Colaboração em Equipe',
  'time tracking software': 'Controle de Tempo',
  'transactional email': 'E-mail Transacional',
  transcription: 'Transcrição',
  'url shortener': 'Encurtador de Links',
  'video & audio': 'Vídeo & Áudio',
  'video conferencing': 'Videoconferência',
  webinars: 'Webinars',
  'website builders': 'Criação de Sites',
}
const OUTRAS = 'Outras'

export function rotulo(cat?: string, fallbackName?: string): string {
  const porSlug = cat ? CATEGORIA_LABEL[cat.toLowerCase()] : undefined
  if (porSlug) return porSlug
  const nome = fallbackName?.trim()
  const porNome = nome ? CATEGORIA_LABEL[nome.toLowerCase()] : undefined
  if (porNome) return porNome
  return nome || OUTRAS
}


export function agruparIntegracoesPorCategoria(cards: IntegracaoCard[]): {
  conectadas: IntegracaoCard[]; destaque: IntegracaoCard[]; categorias: SecaoIntegracao[]
} {
  const conectadas = cards.filter((c) => c.connected)
  const destaque = cards.filter((c) => !c.connected && c.destaque)
  const ordem: string[] = []
  const mapa = new Map<string, IntegracaoCard[]>()
  for (const c of cards) {
    if (c.connected || c.destaque) continue
    const t = c.categoriaLabel ?? rotulo(c.category)
    if (!mapa.has(t)) { mapa.set(t, []); ordem.push(t) }
    mapa.get(t)!.push(c)
  }
  
  const titulos = ordem.filter((t) => t !== OUTRAS).concat(ordem.includes(OUTRAS) ? [OUTRAS] : [])
  return { conectadas, destaque, categorias: titulos.map((titulo) => ({ titulo, cards: mapa.get(titulo)! })) }
}


export function filtrarIntegracoes(cards: IntegracaoCard[], q: string): IntegracaoCard[] {
  const nq = normalizarTermo(q.trim())
  if (!nq) return cards
  const slugsAlias = new Set(matchAliases(q))
  return cards.filter((c) => normalizarTermo(c.name).includes(nq) || slugsAlias.has(c.slug))
}
