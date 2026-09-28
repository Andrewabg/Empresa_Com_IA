




import { mesmoTelefone } from './telefone'

export function deveIgnorarSandbox(config: Record<string, unknown>, contatoExternalId: string): boolean {
  if (config?.modo_teste !== true) return false
  const lista = Array.isArray(config.numeros_teste) ? config.numeros_teste : []
  return !lista.some((n) => mesmoTelefone(String(n), contatoExternalId))
}
