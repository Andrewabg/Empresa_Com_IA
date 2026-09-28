









import type { PecaStatus } from '@/data/pecas'

export interface ArteGerada {
  id: string
  titulo: string
  status: PecaStatus
  
  provas: number
  
  updatedAt: string
}


export const MAX_ARTES_NA_DIRETIVA = 5

const SITUACAO: Record<PecaStatus, string> = {
  brief: 'ainda no briefing',
  rascunho: 'aguardando você escolher',
  revisao: 'revisada, aguardando você escolher',
  aprovada: 'arte final aprovada',
  arquivada: 'arquivada',
}

function linha(a: ArteGerada, primeira: boolean): string {
  const partes = [
    ...(a.provas > 0 ? [`${a.provas} ${a.provas === 1 ? 'prova' : 'provas'}`] : []),
    SITUACAO[a.status],
  ]
  const marca = primeira ? ' [a mais recente — é esta que "essa aí" quer dizer]' : ''
  return `- "${a.titulo}" (pecaId ${a.id}) — ${partes.join(', ')}${marca}`
}


export function designArtesDirective(artes: ArteGerada[]): string {
  if (!artes.length) return ''
  const recentes = [...artes]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0))
    .slice(0, MAX_ARTES_NA_DIRETIVA)
  return [
    'ARTES JÁ GERADAS (o operador pode estar falando de uma delas):',
    ...recentes.map((a, i) => linha(a, i === 0)),
    'Quando ele pedir mudança numa arte ("gera de novo", "muda o CTA", "essa aí mais escura", "tira o café da mesa"), NÃO pergunte qual nem responda só com texto: aja com o pecaId ACIMA.',
    'Qual ferramenta: `remixarCriativo` quando ele gostou da arte e quer um ajuste NELA (mantém a mesma cena). `revisarCriativo` quando ele quer outro caminho e a cena pode mudar. `finalizarCriativo` quando ele escolheu uma prova. `gerarCriativo` NÃO serve aqui — ele só produz a primeira leva de um brief.',
  ].join('\n')
}
