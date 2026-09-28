


export const TITULO_MAX = 160


export const CORPO_MAX = 100_000

export type EdicaoInvalida =
  | 'titulo_vazio'
  | 'titulo_longo'
  | 'corpo_vazio'
  | 'corpo_longo'
  | 'sem_mudanca'

export interface EdicaoNota {
  titulo: string
  corpo: string
}

export interface ValidacaoEdicao {
  ok: boolean
  motivo?: EdicaoInvalida
  
  aviso: string
}

const AVISOS: Record<EdicaoInvalida, string> = {
  titulo_vazio: 'A nota precisa de um título.',
  titulo_longo: `O título passou de ${TITULO_MAX} caracteres.`,
  corpo_vazio: 'A nota ficaria vazia. Para tirá-la do Cérebro, use Excluir.',
  corpo_longo: 'O texto é grande demais para uma nota só. Quebre em duas.',
  sem_mudanca: 'Nada mudou nesta nota.',
}


export function normalizarEdicao(edicao: EdicaoNota): EdicaoNota {
  return {
    titulo: edicao.titulo.replace(/\s+/g, ' ').trim(),
    corpo: edicao.corpo.replace(/\r\n/g, '\n').trim(),
  }
}


export function validarEdicao(edicao: EdicaoNota, original: EdicaoNota): ValidacaoEdicao {
  const novo = normalizarEdicao(edicao)
  const velho = normalizarEdicao(original)

  const motivo = motivoDaRecusa(novo, velho)
  return motivo ? { ok: false, motivo, aviso: AVISOS[motivo] } : { ok: true, aviso: '' }
}

function motivoDaRecusa(novo: EdicaoNota, velho: EdicaoNota): EdicaoInvalida | null {
  if (!novo.titulo) return 'titulo_vazio'
  if (novo.titulo.length > TITULO_MAX) return 'titulo_longo'
  if (!novo.corpo) return 'corpo_vazio'
  if (novo.corpo.length > CORPO_MAX) return 'corpo_longo'
  if (novo.titulo === velho.titulo && novo.corpo === velho.corpo) return 'sem_mudanca'
  return null
}


export const AVISO_VIROU_PEDIDO =
  'A nota continua como estava: não consegui gravar direto no seu Cérebro agora, ' +
  'e deixei sua alteração guardada como um pedido no GitHub.'


export const AVISO_INDICE_ATRASADO =
  'Salva. Seus agentes podem levar alguns minutos para enxergar o texto novo.'


export function mensagemDoCommit(titulo: string): string {
  const limpo = normalizarEdicao({ titulo, corpo: '' }).titulo.slice(0, TITULO_MAX)
  return `brain: o dono editou "${limpo}"`
}
