// src/server/custom/valida.ts — helper fail-fast compartilhado pelos registries
// por-kind (registryTools/registryPages/registryApis). Erro claro apontando o
// ARQUIVO do cliente > falha silenciosa pra IA dele.

/** Lança erro PT-BR apontando o arquivo do cliente quando há erros; senão devolve os itens. */
export function ouExplode<T>(itens: T[], erros: string[], arquivo: string): T[] {
  if (erros.length) {
    throw new Error(`Registro custom inválido — corrija em ${arquivo}:\n- ${erros.join('\n- ')}`)
  }
  return itens
}
