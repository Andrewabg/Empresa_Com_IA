



export function resolverOrigemSolicitante(
  createdBy: string | null | undefined,
  producerId: string,
): string | undefined {
  if (!createdBy) return undefined
  if (createdBy === producerId) return undefined
  if (createdBy === 'jarvis') return undefined
  return createdBy
}
