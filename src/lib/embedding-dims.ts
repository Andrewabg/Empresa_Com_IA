



























export const SCHEMA_EMBEDDING_DIM = 1536


export const KNOWN_EMBEDDING_DIMS: Readonly<Record<string, number>> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
}


export function knownEmbeddingDim(model: string): number | null {
  return KNOWN_EMBEDDING_DIMS[model] ?? null
}


export function assertEmbeddingDim(model: string, schemaDim: number = SCHEMA_EMBEDDING_DIM): void {
  const dim = knownEmbeddingDim(model)
  if (dim !== null && dim !== schemaDim) {
    throw new Error(
      `[embedding] EMBEDDING_MODEL="${model}" tem ${dim} dimensões, mas as colunas pgvector ` +
        `do schema são vector(${schemaDim}). Trocar de modelo de dimensão diferente NÃO é só ` +
        `mudar a env: exige uma migration de dimensão (colunas vector(${dim}) + índices HNSW + ` +
        `RPCs de busca) e re-embed de todo o acervo. Volte para um modelo de ${schemaDim} dims ` +
        `(ex.: text-embedding-3-small) OU faça a migration antes. Ver src/lib/embedding-dims.ts.`,
    )
  }
}
