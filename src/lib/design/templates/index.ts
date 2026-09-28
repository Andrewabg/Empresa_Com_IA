








import type { TemplateDeArte } from './tipos'

export * from './tipos'

export const TEMPLATES_DE_ARTE: TemplateDeArte[] = [
  {
    slug: 'faixa-topo',
    nome: 'Faixa no topo',
    descricao: 'Uma faixa de cor no alto com a headline grande, a cena livre embaixo e o botão perto do rodapé.',
    camadas: [
      { tipo: 'solido', ancora: { x: 0, y: 0, w: 1, h: 0.34 }, papel: 'fundo', opacidade: 1 },
    ],
    faixas: [
      {
        bloco: 'headline', ancora: { x: 0, y: 0, w: 1, h: 0.24 },
        papel: 'display', peso: 700, escala: { min: 0.055, max: 0.105 },
        maxLinhas: 3, entrelinha: 1.05, alinhamento: 'esquerda', alinhamentoV: 'topo',
        caixaAlta: true, cor: 'sobreFundo',
      },
      {
        bloco: 'subheadline', ancora: { x: 0, y: 0.26, w: 0.9, h: 0.1 },
        papel: 'corpo', peso: 400, escala: { min: 0.025, max: 0.04 },
        maxLinhas: 2, entrelinha: 1.3, alinhamento: 'esquerda', alinhamentoV: 'topo',
        cor: 'auto', veu: true,
      },
      {
        bloco: 'cta', ancora: { x: 0, y: 0.86, w: 0.75, h: 0.12 },
        papel: 'corpo', peso: 700, escala: { min: 0.028, max: 0.045 },
        maxLinhas: 1, entrelinha: 1.2, alinhamento: 'centro', alinhamentoV: 'base',
        caixaAlta: true, cor: 'sobreBotao', pilula: true,
      },
    ],
    fundoPede: 'Keep the top third of the frame visually simple and uncluttered; place the subject in the lower two thirds.',
    marcaEm: 'inferior-direita',
  },
  {
    slug: 'bloco-rodape',
    nome: 'Bloco no rodapé',
    descricao: 'A cena domina a peça e o texto se apoia num degradê no rodapé, com headline, apoio e botão empilhados.',
    camadas: [
      { tipo: 'gradiente', ancora: { x: 0, y: 0.35, w: 1, h: 0.65 }, papel: 'fundo', opacidade: 0.92, sentido: 'para-cima' },
    ],
    faixas: [
      {
        bloco: 'headline', ancora: { x: 0, y: 0.5, w: 1, h: 0.24 },
        papel: 'display', peso: 700, escala: { min: 0.055, max: 0.1 },
        maxLinhas: 3, entrelinha: 1.05, alinhamento: 'esquerda', alinhamentoV: 'base',
        caixaAlta: true, cor: 'sobreFundo',
      },
      {
        bloco: 'subheadline', ancora: { x: 0, y: 0.76, w: 0.92, h: 0.1 },
        papel: 'corpo', peso: 400, escala: { min: 0.024, max: 0.038 },
        maxLinhas: 2, entrelinha: 1.3, alinhamento: 'esquerda', alinhamentoV: 'topo',
        cor: 'sobreFundo',
      },
      {
        bloco: 'cta', ancora: { x: 0, y: 0.88, w: 0.7, h: 0.12 },
        papel: 'corpo', peso: 700, escala: { min: 0.028, max: 0.045 },
        maxLinhas: 1, entrelinha: 1.2, alinhamento: 'centro', alinhamentoV: 'base',
        caixaAlta: true, cor: 'sobreBotao', pilula: true,
      },
    ],
    fundoPede: 'Keep the lower half of the frame calm and free of important detail; the subject must live in the upper half.',
    marcaEm: 'superior-direita',
  },
  {
    slug: 'editorial-central',
    nome: 'Editorial central',
    descricao: 'Headline enorme no meio da peça, sem faixa de cor, com a cena aparecendo em volta e o botão discreto embaixo.',
    camadas: [],
    faixas: [
      {
        bloco: 'headline', ancora: { x: 0.04, y: 0.3, w: 0.92, h: 0.3 },
        papel: 'display', peso: 700, escala: { min: 0.06, max: 0.13 },
        maxLinhas: 4, entrelinha: 1.02, alinhamento: 'centro', alinhamentoV: 'meio',
        caixaAlta: true, cor: 'auto', veu: true,
      },
      {
        bloco: 'subheadline', ancora: { x: 0.08, y: 0.62, w: 0.84, h: 0.1 },
        papel: 'corpo', peso: 400, escala: { min: 0.024, max: 0.036 },
        maxLinhas: 2, entrelinha: 1.35, alinhamento: 'centro', alinhamentoV: 'topo',
        cor: 'auto', veu: true,
      },
      {
        bloco: 'cta', ancora: { x: 0.15, y: 0.86, w: 0.7, h: 0.12 },
        papel: 'corpo', peso: 700, escala: { min: 0.026, max: 0.042 },
        maxLinhas: 1, entrelinha: 1.2, alinhamento: 'centro', alinhamentoV: 'base',
        caixaAlta: true, cor: 'sobreBotao', pilula: true,
      },
    ],
    fundoPede: 'Leave the center of the frame open and uncluttered; push the subject to one side, with generous negative space in the middle.',
    marcaEm: 'superior-esquerda',
  },
  {
    slug: 'split-tipografico',
    nome: 'Split tipográfico',
    descricao: 'A peça é dividida: um bloco de cor sólida em cima com a mensagem, e a foto ocupando a metade de baixo.',
    camadas: [
      { tipo: 'solido', ancora: { x: 0, y: 0, w: 1, h: 0.47 }, papel: 'fundo', opacidade: 1 },
    ],
    faixas: [
      {
        bloco: 'selo', ancora: { x: 0, y: 0, w: 0.6, h: 0.05 },
        papel: 'corpo', peso: 700, escala: { min: 0.018, max: 0.028 },
        maxLinhas: 1, entrelinha: 1.2, alinhamento: 'esquerda', alinhamentoV: 'topo',
        caixaAlta: true, cor: 'destaque',
      },
      {
        bloco: 'headline', ancora: { x: 0, y: 0.07, w: 1, h: 0.26 },
        papel: 'display', peso: 700, escala: { min: 0.06, max: 0.12 },
        maxLinhas: 3, entrelinha: 1.02, alinhamento: 'esquerda', alinhamentoV: 'topo',
        caixaAlta: true, cor: 'sobreFundo',
      },
      {
        bloco: 'subheadline', ancora: { x: 0, y: 0.34, w: 0.88, h: 0.08 },
        papel: 'corpo', peso: 400, escala: { min: 0.022, max: 0.034 },
        maxLinhas: 2, entrelinha: 1.3, alinhamento: 'esquerda', alinhamentoV: 'topo',
        cor: 'sobreFundo',
      },
      {
        bloco: 'cta', ancora: { x: 0, y: 0.87, w: 0.72, h: 0.12 },
        papel: 'corpo', peso: 700, escala: { min: 0.028, max: 0.045 },
        maxLinhas: 1, entrelinha: 1.2, alinhamento: 'centro', alinhamentoV: 'base',
        caixaAlta: true, cor: 'sobreBotao', pilula: true,
      },
    ],
    fundoPede: 'The subject must be entirely inside the lower half of the frame; the upper half can be plain, it will be covered by a solid color block.',
    marcaEm: 'superior-direita',
  },
  {
    slug: 'prova-social',
    nome: 'Prova social',
    descricao: 'Formato de depoimento: um cartão claro no meio com a frase do cliente, o nome de quem falou e o botão embaixo.',
    camadas: [
      { tipo: 'veu', ancora: { x: 0, y: 0, w: 1, h: 1 }, papel: 'fundo', opacidade: 0.35 },
      { tipo: 'solido', ancora: { x: 0.07, y: 0.36, w: 0.86, h: 0.34 }, papel: 'fundo', opacidade: 1, raio: 0.035 },
    ],
    faixas: [
      {
        bloco: 'subheadline', ancora: { x: 0.12, y: 0.36, w: 0.76, h: 0.2 },
        papel: 'display', peso: 400, escala: { min: 0.032, max: 0.058 },
        maxLinhas: 5, entrelinha: 1.22, alinhamento: 'esquerda', alinhamentoV: 'meio',
        cor: 'sobreFundo',
      },
      {
        bloco: 'headline', ancora: { x: 0.12, y: 0.58, w: 0.76, h: 0.06 },
        papel: 'corpo', peso: 700, escala: { min: 0.02, max: 0.03 },
        maxLinhas: 2, entrelinha: 1.2, alinhamento: 'esquerda', alinhamentoV: 'topo',
        caixaAlta: true, cor: 'destaque',
      },
      {
        bloco: 'cta', ancora: { x: 0.15, y: 0.86, w: 0.7, h: 0.12 },
        papel: 'corpo', peso: 700, escala: { min: 0.026, max: 0.042 },
        maxLinhas: 1, entrelinha: 1.2, alinhamento: 'centro', alinhamentoV: 'base',
        caixaAlta: true, cor: 'sobreBotao', pilula: true,
      },
    ],
    fundoPede: 'A real person photographed in a natural everyday environment, framed in the upper part of the image, with room in the middle.',
    marcaEm: 'superior-direita',
  },
  {
    slug: 'capa-carrossel',
    nome: 'Capa de carrossel',
    descricao: 'Capa de uma sequência: uma imagem só, headline enorme no centro e uma indicação de que há mais para ver.',
    camadas: [
      { tipo: 'veu', ancora: { x: 0, y: 0, w: 1, h: 1 }, papel: 'fundo', opacidade: 0.45 },
    ],
    faixas: [
      {
        bloco: 'headline', ancora: { x: 0.04, y: 0.24, w: 0.92, h: 0.4 },
        papel: 'display', peso: 700, escala: { min: 0.07, max: 0.15 },
        maxLinhas: 4, entrelinha: 1.0, alinhamento: 'centro', alinhamentoV: 'meio',
        caixaAlta: true, cor: 'sobreFundo',
      },
      {
        bloco: 'selo', ancora: { x: 0.2, y: 0.88, w: 0.6, h: 0.08 },
        papel: 'corpo', peso: 700, escala: { min: 0.02, max: 0.032 },
        maxLinhas: 1, entrelinha: 1.2, alinhamento: 'centro', alinhamentoV: 'base',
        caixaAlta: true, cor: 'sobreFundo',
      },
    ],
    fundoPede: 'One single strong image filling the frame, simple and graphic, without busy detail or competing focal points.',
    marcaEm: 'superior-direita',
    formatos: ['post-quadrado', 'post-feed', 'carrossel'],
  },
  
  
  
  
  {
    slug: 'slide-declaracao',
    nome: 'Slide de afirmação',
    descricao: 'Uma frase grande sobre a cor da marca, sem foto. Serve para o argumento central de um slide.',
    camadas: [],
    faixas: [
      {
        bloco: 'headline', ancora: { x: 0, y: 0.16, w: 1, h: 0.44 },
        papel: 'display', peso: 700, escala: { min: 0.06, max: 0.13 },
        maxLinhas: 5, entrelinha: 1.05, alinhamento: 'esquerda', alinhamentoV: 'meio',
        caixaAlta: true, cor: 'sobreFundo',
      },
      {
        bloco: 'subheadline', ancora: { x: 0, y: 0.63, w: 0.94, h: 0.2 },
        papel: 'corpo', peso: 400, escala: { min: 0.026, max: 0.042 },
        maxLinhas: 4, entrelinha: 1.35, alinhamento: 'esquerda', alinhamentoV: 'topo',
        cor: 'sobreFundo',
      },
    ],
    fundoPede: '',
    semFoto: true,
    marcaEm: 'inferior-direita',
    formatos: ['carrossel'],
  },
  {
    slug: 'slide-numerado',
    nome: 'Slide numerado',
    descricao: 'Um número ou etiqueta grande no alto, o argumento embaixo. Serve para passo a passo e listas.',
    camadas: [
      { tipo: 'solido', ancora: { x: 0, y: 0, w: 1, h: 0.3 }, papel: 'destaque', opacidade: 1 },
    ],
    faixas: [
      {
        bloco: 'selo', ancora: { x: 0, y: 0.02, w: 0.5, h: 0.16 },
        papel: 'display', peso: 700, escala: { min: 0.06, max: 0.13 },
        maxLinhas: 1, entrelinha: 1.0, alinhamento: 'esquerda', alinhamentoV: 'topo',
        caixaAlta: true, cor: 'auto',
      },
      {
        bloco: 'headline', ancora: { x: 0, y: 0.3, w: 1, h: 0.34 },
        papel: 'display', peso: 700, escala: { min: 0.05, max: 0.1 },
        maxLinhas: 4, entrelinha: 1.08, alinhamento: 'esquerda', alinhamentoV: 'topo',
        caixaAlta: true, cor: 'sobreFundo',
      },
      {
        bloco: 'subheadline', ancora: { x: 0, y: 0.66, w: 0.94, h: 0.2 },
        papel: 'corpo', peso: 400, escala: { min: 0.026, max: 0.042 },
        maxLinhas: 4, entrelinha: 1.35, alinhamento: 'esquerda', alinhamentoV: 'topo',
        cor: 'sobreFundo',
      },
    ],
    fundoPede: '',
    semFoto: true,
    marcaEm: 'inferior-direita',
    formatos: ['carrossel'],
  },
  {
    slug: 'slide-fechamento',
    nome: 'Slide de fechamento',
    descricao: 'O último slide: a frase que fecha e o botão da chamada para ação, centralizados.',
    camadas: [],
    faixas: [
      {
        bloco: 'headline', ancora: { x: 0.02, y: 0.22, w: 0.96, h: 0.34 },
        papel: 'display', peso: 700, escala: { min: 0.06, max: 0.12 },
        maxLinhas: 4, entrelinha: 1.05, alinhamento: 'centro', alinhamentoV: 'meio',
        caixaAlta: true, cor: 'sobreFundo',
      },
      {
        bloco: 'subheadline', ancora: { x: 0.06, y: 0.58, w: 0.88, h: 0.14 },
        papel: 'corpo', peso: 400, escala: { min: 0.024, max: 0.038 },
        maxLinhas: 3, entrelinha: 1.35, alinhamento: 'centro', alinhamentoV: 'topo',
        cor: 'sobreFundo',
      },
      {
        bloco: 'cta', ancora: { x: 0.12, y: 0.78, w: 0.76, h: 0.12 },
        papel: 'corpo', peso: 700, escala: { min: 0.028, max: 0.045 },
        maxLinhas: 1, entrelinha: 1.2, alinhamento: 'centro', alinhamentoV: 'meio',
        caixaAlta: true, cor: 'sobreBotao', pilula: true,
      },
    ],
    fundoPede: '',
    semFoto: true,
    marcaEm: 'superior-direita',
    formatos: ['carrossel'],
  },
]


export const TEMPLATE_CAPA_CARROSSEL = 'capa-carrossel'
export const TEMPLATE_FECHAMENTO_CARROSSEL = 'slide-fechamento'

export const TEMPLATES_DE_MIOLO = ['slide-declaracao', 'slide-numerado'] as const

export const TEMPLATE_PADRAO = 'bloco-rodape'


export function templateCru(t: TemplateDeArte): TemplateDeArte {
  return {
    ...t,
    
    
    
    
    
    
    
    
    faixas: t.faixas.map((f) => (f.pilula ? { ...f, pilula: false, cor: 'auto' as const, veu: true } : f)),
  }
}


export function getTemplateDeArte(slug: string | null | undefined): TemplateDeArte {
  const s = (slug ?? '').trim().toLowerCase()
  return (
    TEMPLATES_DE_ARTE.find((t) => t.slug === s) ??
    TEMPLATES_DE_ARTE.find((t) => t.slug === TEMPLATE_PADRAO)!
  )
}


export function templatesDoFormato(formato: string): TemplateDeArte[] {
  const f = (formato ?? '').trim().toLowerCase()
  return TEMPLATES_DE_ARTE.filter((t) => !t.formatos || t.formatos.includes(f))
}



export function alternarTemplatesDoMiolo(pedidos: string[]): string[] {
  const ciclo = TEMPLATES_DE_MIOLO
  const out: string[] = []
  let anterior = ''
  for (const pedido of pedidos ?? []) {
    const alvo = getTemplateDeArte(pedido)
    
    
    const ehMiolo = (ciclo as readonly string[]).includes(alvo.slug)
    let escolhido = ehMiolo ? alvo.slug : ciclo[out.length % ciclo.length]!
    if (escolhido === anterior) {
      escolhido = ciclo[(ciclo.indexOf(escolhido as never) + 1) % ciclo.length]!
    }
    out.push(escolhido)
    anterior = escolhido
  }
  return out
}

export function distribuirTemplates(pedidos: string[], formato: string): string[] {
  const disponiveis = templatesDoFormato(formato)
  const usados = new Set<string>()
  return pedidos.map((pedido) => {
    const alvo = getTemplateDeArte(pedido)
    
    
    const serve = disponiveis.some((t) => t.slug === alvo.slug)
    if (serve && !usados.has(alvo.slug)) { usados.add(alvo.slug); return alvo.slug }
    const livre = disponiveis.find((t) => !usados.has(t.slug))
    if (livre) { usados.add(livre.slug); return livre.slug }
    
    return alvo.slug
  })
}
