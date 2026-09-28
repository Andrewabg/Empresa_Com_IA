// src/server/custom/validarEntradaConfig.ts — PURO. Valida o BODY que o card de
// integração do /config manda contra os campos DECLARADOS em custom/config. É o
// portão anti-mass-assignment da rota /api/config/custom: só chave declarada e
// custom_* pode ser gravada; obrigatório vazio é acusado. Determinístico/testável.
import type { ConfigCustom } from './contrato'

/**
 * Devolve a lista de erros (vazia = ok) da entrada `valores` contra as `configs`
 * declaradas. Barra:
 *  - chave recebida que NÃO está declarada em `configs` (allow-list FECHADA — anti
 *    mass-assignment: impede injetar `openai_api_key`, `custom_*` não-declarada, etc.);
 *  - chave declarada fora do prefixo `custom_` (defesa em profundidade — o registry
 *    já valida, mas nunca gravamos fora do escopo custom);
 *  - campo `obrigatorio` PRESENTE no payload porém vazio (trim). Obrigatório AUSENTE
 *    não é cobrado aqui: a UI manda só o que mudou (save parcial), e "obrigatório" é
 *    gate de SETUP, não de todo POST — ausente ≠ apagar.
 *  - valor não-string numa chave declarada (defensivo: body cru pode vir malformado).
 */
export function validarEntradaConfigCustom(
  configs: ConfigCustom[],
  valores: Record<string, string>,
): string[] {
  const erros: string[] = []
  const declaradas = new Map(configs.map((c) => [c.chave, c]))

  // (1) Toda chave recebida tem que ser declarada + custom_* (allow-list fechada).
  for (const chave of Object.keys(valores)) {
    const decl = declaradas.get(chave)
    if (!decl) {
      erros.push(`chave "${chave}" não é um campo de integração declarado`)
      continue
    }
    if (!chave.startsWith('custom_')) {
      erros.push(`chave "${chave}" precisa começar com "custom_"`)
      continue
    }
    if (typeof valores[chave] !== 'string') {
      erros.push(`chave "${chave}" precisa ser texto`)
    }
  }

  // (2) Obrigatório PRESENTE não pode vir vazio.
  for (const c of configs) {
    if (!c.obrigatorio) continue
    if (!(c.chave in valores)) continue // ausente ≠ vazio (save parcial)
    const v = valores[c.chave]
    if (typeof v !== 'string' || v.trim() === '') {
      erros.push(`o campo "${c.rotulo}" (${c.chave}) é obrigatório`)
    }
  }

  return erros
}
