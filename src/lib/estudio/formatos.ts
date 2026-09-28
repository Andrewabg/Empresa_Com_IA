


import { violacaoDeLimite } from './blocos'

export interface CampoLimite { campo: string; max: number; label: string }
export interface FormatoSpec {
  slug: string
  nome: string
  canal: string            
  descricao: string
  
  estrutura: string[]
  
  limites?: CampoLimite[]
  
  checklist: string[]
  
  compliance: string[]
  
  perguntas: string[]
  
  variacoesSugeridas: number
  
  roteiro?: boolean
  
  duracaoAlvoS?: number
}

export const FORMATOS: FormatoSpec[] = [
  
  {
    slug: 'meta-ad', nome: 'Anúncio Meta', canal: 'meta-ads',
    descricao: 'Anúncio de feed/stories (primário + headline + descrição).',
    estrutura: ['texto primário (gancho + corpo)', 'headline', 'descrição', 'CTA'],
    limites: [
      { campo: 'primario', max: 125, label: 'Texto principal (recomendado ≤125, o Meta corta no celular)' },
      { campo: 'headline', max: 40, label: 'Headline (recomendado ≤40)' },
      { campo: 'descricao', max: 30, label: 'Descrição (recomendado ≤30)' },
    ],
    checklist: [
      'Gancho para nos 3 primeiros segundos de leitura',
      'Uma promessa clara e específica',
      'Prova ou credibilidade presente',
      'Um único CTA inequívoco',
      'Respeita a voz da marca e os aprendizados',
    ],
    compliance: [
      'Sem "você" acusatório sobre atributos pessoais/saúde (política Meta)',
      'Sem promessa de resultado garantido/renda garantida',
      'Sem sensacionalismo enganoso (clickbait proibido)',
    ],
    perguntas: ['Qual a etapa do funil (topo/meio/fundo)?', 'Qual a oferta exata deste anúncio?'],
    variacoesSugeridas: 3,
  },
  {
    slug: 'google-search', nome: 'Google Search (RSA)', canal: 'google-ads',
    descricao: 'Anúncio de rede de pesquisa: headlines 30 / descriptions 90.',
    estrutura: ['15 headlines (≤30)', '4 descriptions (≤90)', 'palavra-chave no H1'],
    limites: [
      { campo: 'headline', max: 30, label: 'Headline Google (≤30)' },
      { campo: 'descricao', max: 90, label: 'Description Google (≤90)' },
    ],
    checklist: [
      'Palavra-chave principal na headline 1',
      'Benefício + CTA distribuídos',
      'Sem repetição entre headlines',
      'Respeita a voz da marca',
    ],
    compliance: ['Sem pontuação excessiva/CAPS', 'Sem superlativos não comprováveis ("o melhor")'],
    perguntas: ['Qual a palavra-chave alvo?', 'Qual a intenção de busca (informacional/transacional)?'],
    variacoesSugeridas: 3,
  },
  
  {
    slug: 'reels', nome: 'Roteiro Reels', canal: 'reels',
    descricao: 'Roteiro de Reels: hook + desenvolvimento + CTA nativo.',
    estrutura: ['hook (0-3s)', 'retenção (desenvolvimento)', 'clímax/valor', 'CTA'],
    checklist: ['Hook visual+verbal nos 3s', 'Ritmo de retenção (cortes/loops)', 'CTA nativo (não "link na bio" genérico)', 'Voz da marca no registro Reels'],
    compliance: ['Sem música/claim que viole direitos', 'Legenda acessível'],
    perguntas: ['Qual o formato (talking head, b-roll, tutorial)?', 'Qual a duração alvo?'],
    variacoesSugeridas: 3, roteiro: true, duracaoAlvoS: 30,
  },
  {
    slug: 'tiktok', nome: 'Roteiro TikTok', canal: 'tiktok',
    descricao: 'Roteiro TikTok: cru, nativo, hook forte.',
    estrutura: ['hook (0-2s)', 'história/valor', 'CTA sutil'],
    checklist: ['Hook nos 2s', 'Tom cru e nativo (não parece anúncio)', 'Trend/áudio quando cabível', 'Voz da marca no dialeto TikTok'],
    compliance: ['Sem watermark de outra plataforma', 'Claims verificáveis'],
    perguntas: ['Tem trend/áudio de referência?', 'Qual a vibe (humor, choque, tutorial)?'],
    variacoesSugeridas: 3, roteiro: true, duracaoAlvoS: 25,
  },
  {
    slug: 'shorts', nome: 'Roteiro Shorts', canal: 'shorts',
    descricao: 'YouTube Shorts: hook + payoff rápido.',
    estrutura: ['hook (0-3s)', 'desenvolvimento', 'CTA (inscrever/assistir)'],
    checklist: ['Hook nos 3s', 'Payoff claro', 'CTA de canal', 'Voz da marca'],
    compliance: ['Sem reuso não-original penalizável'],
    perguntas: ['É teaser de vídeo longo?'],
    variacoesSugeridas: 3, roteiro: true, duracaoAlvoS: 30,
  },
  {
    slug: 'ugc', nome: 'Roteiro UGC', canal: 'reels',
    descricao: 'Depoimento espontâneo gravado no celular: parece cliente falando, não anúncio.',
    estrutura: ['gancho em 1a pessoa (0-3s)', 'antes (o problema vivido)', 'virada (o que mudou)', 'prova concreta', 'recomendação direta'],
    checklist: [
      'Fala em primeira pessoa, do jeito que a pessoa fala mesmo',
      'Um detalhe específico que só quem viveu contaria',
      'Nada de linguagem de folheto (o UGC morre no tom publicitário)',
      'Recomendação no fim, sem CTA de locutor',
      'Respeita a voz da marca e os aprendizados',
    ],
    compliance: [
      'Depoimento só a partir de caso real (nada de experiência inventada)',
      'Sem promessa de resultado garantido',
      'Se for gravado por ator, o roteiro precisa poder ser marcado como publicidade',
    ],
    perguntas: ['Qual cliente ou caso real inspira o depoimento?', 'Vai ser gravado por cliente ou por ator?'],
    variacoesSugeridas: 3, roteiro: true, duracaoAlvoS: 40,
  },
  {
    slug: 'vsl', nome: 'Roteiro VSL', canal: 'landing',
    descricao: 'Video sales letter: a carta de vendas falada, da dor até a oferta.',
    estrutura: ['gancho/promessa (0-15s)', 'problema e custo de não resolver', 'história/credibilidade', 'mecanismo (por que funciona)', 'prova', 'oferta e o que está incluso', 'objeções', 'CTA e urgência real'],
    checklist: [
      'Promessa grande porém sustentada por prova',
      'Mecanismo explicado (o porquê de aquilo funcionar)',
      'Objeções endereçadas antes do preço',
      'Um CTA repetido, não vários diferentes',
      'Respeita a voz da marca',
    ],
    compliance: ['Claim com prova', 'Sem escassez falsa', 'Sem renda garantida'],
    perguntas: ['Qual a oferta exata e o preço?', 'Quais provas reais existem (casos, números, depoimentos)?'],
    variacoesSugeridas: 1, roteiro: true, duracaoAlvoS: 300,
  },
  {
    slug: 'anuncio-15s', nome: 'Anúncio em vídeo 15s', canal: 'meta-ads',
    descricao: 'Vídeo de performance de 15 segundos: um problema, uma virada, um CTA.',
    estrutura: ['gancho (0-3s)', 'problema/benefício', 'prova rápida', 'CTA'],
    checklist: ['A marca aparece nos 3 primeiros segundos', 'Uma ideia só', 'CTA falado e escrito', 'Funciona sem som'],
    compliance: ['Sem promessa de resultado garantido', 'Sem "você" acusatório sobre saúde/atributos pessoais'],
    perguntas: ['Qual a oferta exata?', 'Qual a etapa do funil (topo/meio/fundo)?'],
    variacoesSugeridas: 3, roteiro: true, duracaoAlvoS: 15,
  },
  {
    slug: 'anuncio-30s', nome: 'Anúncio em vídeo 30s', canal: 'meta-ads',
    descricao: 'Vídeo de performance de 30 segundos: dor, mecanismo, prova, CTA.',
    estrutura: ['gancho (0-3s)', 'dor específica', 'mecanismo/solução', 'prova', 'CTA'],
    checklist: ['A marca aparece nos 3 primeiros segundos', 'Prova concreta no meio', 'CTA falado e escrito', 'Funciona sem som'],
    compliance: ['Sem promessa de resultado garantido', 'Sem "você" acusatório sobre saúde/atributos pessoais'],
    perguntas: ['Qual a oferta exata?', 'Qual a etapa do funil (topo/meio/fundo)?'],
    variacoesSugeridas: 3, roteiro: true, duracaoAlvoS: 30,
  },
  {
    slug: 'anuncio-60s', nome: 'Anúncio em vídeo 60s', canal: 'meta-ads',
    descricao: 'Vídeo de performance de 60 segundos: espaço para história e para a objeção.',
    estrutura: ['gancho (0-3s)', 'história/contexto', 'mecanismo', 'prova', 'objeção principal', 'CTA'],
    checklist: ['Retenção pensada a cada 10s', 'Prova concreta', 'Uma objeção endereçada', 'CTA falado e escrito'],
    compliance: ['Sem promessa de resultado garantido', 'Claim com prova'],
    perguntas: ['Qual a oferta exata?', 'Qual a objeção que mais derruba a venda?'],
    variacoesSugeridas: 3, roteiro: true, duracaoAlvoS: 60,
  },
  
  {
    slug: 'landing-page', nome: 'Landing Page', canal: 'landing',
    descricao: 'Página de conversão completa (estrutura de blocos).',
    estrutura: ['hero (promessa + subheadline + CTA)', 'problema/agitação', 'solução', 'prova social', 'oferta', 'objeções/FAQ', 'CTA final'],
    checklist: ['Promessa clara no hero', 'Prova social real', 'Uma oferta, um CTA repetido', 'Objeções endereçadas', 'Voz da marca no registro landing'],
    compliance: ['Claims com prova', 'Sem escassez falsa'],
    perguntas: ['Qual a ação de conversão (compra/lead)?', 'Quais provas reais existem?'],
    variacoesSugeridas: 1, 
  },
  {
    slug: 'email', nome: 'E-mail', canal: 'email',
    descricao: 'E-mail (assunto + corpo + CTA). Boas-vindas, carrinho, lançamento, broadcast.',
    estrutura: ['assunto', 'pré-header', 'abertura (gancho)', 'corpo', 'CTA'],
    limites: [{ campo: 'assunto', max: 60, label: 'Assunto (≤60 p/ não cortar no mobile)' }],
    checklist: ['Assunto que gera abertura sem clickbait', 'Um objetivo por e-mail', 'CTA claro', 'Voz da marca'],
    compliance: ['Sem spam words exageradas', 'Link de descadastro implícito na sequência'],
    perguntas: ['Qual o tipo (boas-vindas/carrinho/lançamento/broadcast)?', 'É parte de uma sequência?'],
    variacoesSugeridas: 3, 
  },
  
  {
    slug: 'post-organico', nome: 'Post orgânico', canal: 'organico',
    descricao: 'Post/carrossel/legenda para social orgânico.',
    estrutura: ['gancho', 'desenvolvimento', 'CTA de engajamento'],
    checklist: ['Gancho na primeira linha', 'Valor real (não só venda)', 'CTA de engajamento', 'Voz da marca'],
    compliance: ['Sem engagement bait proibido'],
    perguntas: ['Formato (carrossel/imagem única/texto)?', 'Qual o objetivo (alcance/engajamento/salvamento)?'],
    variacoesSugeridas: 3,
  },
  {
    slug: 'youtube-longo', nome: 'Roteiro YouTube longo', canal: 'youtube',
    descricao: 'Vídeo longo: título + estrutura de retenção + descrição + thumbnail.',
    estrutura: ['título', 'hook (0-30s)', 'estrutura de retenção (blocos)', 'CTA', 'descrição', 'copy da thumbnail'],
    limites: [{ campo: 'titulo', max: 70, label: 'Título YouTube (≤70)' }],
    checklist: ['Título com curiosidade+clareza', 'Hook nos 30s', 'Retenção por blocos', 'CTA de inscrição', 'Voz da marca'],
    compliance: ['Sem clickbait não cumprido no vídeo'],
    perguntas: ['Qual o tema/palavra-chave?', 'Qual a duração alvo?'],
    variacoesSugeridas: 1, roteiro: true,
  },
]

export function listFormatos(): FormatoSpec[] { return FORMATOS }


export function slugsDeFormato(): string[] { return FORMATOS.map((f) => f.slug) }


export function ehRoteiro(f: FormatoSpec | null | undefined): boolean { return !!f?.roteiro }


export function normalizarSlugDeFormato(slug: string | null | undefined): string {
  return (slug ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-')
}

export function getFormato(slug: string): FormatoSpec | null {
  const alvo = normalizarSlugDeFormato(slug)
  return FORMATOS.find((f) => f.slug === alvo) ?? null
}


export function checarLimites(f: FormatoSpec, campos: Record<string, string | undefined>): string[] {
  const out: string[] = []
  for (const lim of f.limites ?? []) {
    const v = violacaoDeLimite(campos[lim.campo], lim.max, lim.label)
    if (v) out.push(v)
  }
  return out
}
