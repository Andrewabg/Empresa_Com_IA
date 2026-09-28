




export const LIMITE_LINHAS_RECOLHIDO = 10


export const COLUNAS_APROX = 68


export function linhasEstimadas(conteúdo: string, colunas: number = COLUNAS_APROX): number {
  if (!conteúdo.trim()) return 0
  const largura = colunas > 0 ? colunas : COLUNAS_APROX
  return conteúdo
    .split('\n')
    .reduce((total, linha) => total + Math.max(1, Math.ceil(linha.length / largura)), 0)
}


export function precisaDobrar(conteúdo: string, colunas: number = COLUNAS_APROX): boolean {
  return linhasEstimadas(conteúdo, colunas) > LIMITE_LINHAS_RECOLHIDO
}

export type Rascunho = { título: string; conteúdo: string }
export type Validação = { ok: true } | { ok: false; motivo: string }


export function validarRascunho({ título, conteúdo }: Rascunho): Validação {
  if (!título.trim()) return { ok: false, motivo: 'O título não pode ficar vazio.' }
  if (!conteúdo.trim()) return { ok: false, motivo: 'O conteúdo não pode ficar vazio.' }
  return { ok: true }
}


export function rascunhoAlterado(original: Rascunho, atual: Rascunho): boolean {
  return (
    original.título.trim() !== atual.título.trim() ||
    original.conteúdo.trim() !== atual.conteúdo.trim()
  )
}
