


export const AGENTES_INTERNOS: readonly string[] = ['curator-agent']

export interface MissaoHumana {
  tagline: string | null
  descricao: string | null
}


export interface FichaCatalogo {
  tagline: string | null
  descricao: string | null
}



const MISSOES_CURADAS: Readonly<Record<string, MissaoHumana>> = {
  jarvis: {
    tagline: 'O braço direito que nunca dorme',
    descricao: 'Seu conselheiro direto: organiza a empresa, responde na hora e aciona o time.',
  },
  coo: {
    tagline: 'Quem faz o objetivo virar plano',
    descricao: 'Chefe de Gabinete: transforma objetivos em planos e coordena os especialistas.',
  },
}


export function missaoHumana(
  agent: { id: string; role: string },
  catalogo: FichaCatalogo | null,
): MissaoHumana {
  if (catalogo && (catalogo.tagline || catalogo.descricao)) {
    return { tagline: catalogo.tagline ?? null, descricao: catalogo.descricao ?? null }
  }
  const curada = MISSOES_CURADAS[agent.id]
  if (curada) return curada
  return {
    tagline: null,
    descricao: `Especialista em ${agent.role}, contratado sob medida para a sua empresa.`,
  }
}


const STATUS_HUMANO: Readonly<Record<string, string>> = {
  queued: 'na fila',
  running: 'trabalhando agora',
  needs_approval: 'aguardando sua aprovação',
  needs_children: 'coordenando o time',
  done: 'concluída',
  failed: 'precisou de ajuda',
  cancelled: 'cancelada',
}


export function statusHumanoDaTarefa(status: string): string {
  return STATUS_HUMANO[status] ?? status
}
