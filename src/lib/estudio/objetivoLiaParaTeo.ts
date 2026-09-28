










import type { Bloco } from '@/lib/estudio/blocos'

export interface ObjetivoLiaParaTeoInput {
  titulo: string
  formato: string
  
  variacao?: { angulo: string; texto: string; blocos?: Bloco[] }
  
  porque?: string
}


const NOME_DO_BLOCO: Record<string, string> = {
  headline: 'Título',
  subheadline: 'Apoio',
  cta: 'Chamada para ação',
  primario: 'Texto principal',
  descricao: 'Descrição',
  legenda: 'Legenda',
}


export function camposDaCopy(blocos: Bloco[] | undefined): string[] {
  return [...(blocos ?? [])]
    .sort((a, b) => a.ordem - b.ordem)
    .filter((b) => (b.texto ?? '').trim())
    .map((b) => `- ${NOME_DO_BLOCO[b.kind] ?? b.rotulo}: ${b.texto.trim()}`)
}


export function tituloDoPedidoDeArte(titulo: string, formato: string): string {
  const t = (titulo ?? '').trim() || 'Peça sem título'
  return `Arte para "${t}" (${formato})`
}

export function objetivoLiaParaTeo({ titulo, formato, variacao, porque }: ObjetivoLiaParaTeoInput): string {
  const texto = variacao?.texto?.trim()
  const angulo = variacao?.angulo?.trim()
  const porqueLimpo = porque?.trim()
  const campos = camposDaCopy(variacao?.blocos)

  const linhas = [`${tituloDoPedidoDeArte(titulo, formato)}. A copy já está pronta e aprovada.`]

  if (campos.length) {
    
    
    linhas.push(`A copy aprovada pela Lia, campo a campo, e a arte tem que cravar exatamente estes textos:\n${campos.join('\n')}`)
    linhas.push('NÃO reescreva a copy — ela já passou pelo crítico da Lia. Traduza-a em imagem.')
  } else if (texto) {
    linhas.push(`A copy aprovada pela Lia é esta, e a arte tem que cravar exatamente esta mensagem: "${texto}".`)
    linhas.push('NÃO reescreva a copy — ela já passou pelo crítico da Lia. Traduza-a em imagem.')
  }
  if (texto || campos.length) {
    if (angulo) linhas.push(`O ângulo de venda é "${angulo}" — a direção de arte tem que servir a esse ângulo.`)
    if (porqueLimpo) linhas.push(`A Lia escolheu essa variação porque ${porqueLimpo}.`)
  }

  linhas.push('Produza a arte. Use as tools iniciarBriefing e gerarCriativo; não responda em texto.')
  return linhas.join(' ')
}
