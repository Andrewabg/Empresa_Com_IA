










export function nomeAGravar(atual: string, recebido: string, nomeProprio?: string | null): string | null {
  const novo = (recebido ?? '').trim()
  if (!novo) return null
  const gravado = (atual ?? '').trim()
  if (!gravado) return novo
  if (gravado === novo) return null
  const proprio = (nomeProprio ?? '').trim()
  
  
  return proprio && gravado === proprio ? novo : null
}
