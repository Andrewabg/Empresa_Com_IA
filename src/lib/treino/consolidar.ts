

export type Veredito = {
  acao: 'ADD' | 'UPDATE' | 'DELETE' | 'NOOP'
  alvoId?: string | null
  texto?: string | null
}

export type ItemAtual = {
  id: string
  texto: string
}

export type PlanoConsolidacao =
  | { tipo: 'add'; texto: string }
  | { tipo: 'update'; alvoId: string; texto: string }
  | { tipo: 'supersede'; alvoId: string; texto: string }
  | { tipo: 'noop' }

export function planejarConsolidacao(
  veredito: Veredito,
  atuais: ItemAtual[],
): PlanoConsolidacao {
  const texto = veredito.texto ?? ''

  switch (veredito.acao) {
    case 'NOOP':
      return { tipo: 'noop' }

    case 'ADD':
      return { tipo: 'add', texto }

    case 'UPDATE': {
      const alvo = veredito.alvoId
        ? atuais.find((i) => i.id === veredito.alvoId)
        : undefined
      if (alvo) return { tipo: 'update', alvoId: alvo.id, texto }
      
      return { tipo: 'add', texto }
    }

    case 'DELETE': {
      const alvo = veredito.alvoId
        ? atuais.find((i) => i.id === veredito.alvoId)
        : undefined
      if (alvo) return { tipo: 'supersede', alvoId: alvo.id, texto }
      
      return { tipo: 'add', texto }
    }
  }
}
