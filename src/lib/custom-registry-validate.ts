



const TOOL_ID_REGEX = /^[a-z][a-z0-9_]{2,39}$/
const SLUG_REGEX = /^[a-z][a-z0-9-]{2,39}$/


function validarIdsUnicos(valores: string[], regex: RegExp, rotulo: string, campo: string, esperado: string): string[] {
  const erros: string[] = []
  const vistos = new Set<string>()
  for (const valor of valores) {
    if (vistos.has(valor)) {
      erros.push(`${rotulo} custom "${valor}": ${campo} duplicado`)
      continue
    }
    vistos.add(valor)
    if (!regex.test(valor)) erros.push(`${rotulo} custom "${valor}": ${campo} malformado (esperado: ${esperado})`)
  }
  return erros
}


export function validarToolsCustom(tools: { id: string }[]): string[] {
  return validarIdsUnicos(tools.map((t) => t.id), TOOL_ID_REGEX, 'tool', 'id', 'snake_case, 3-40 chars, começando com letra')
}


export function validarSlugsCustom(itens: { slug: string }[], rotulo: string): string[] {
  return validarIdsUnicos(itens.map((i) => i.slug), SLUG_REGEX, rotulo, 'slug', 'kebab-case, 3-40 chars, começando com letra')
}


export function encontrarPorSlug<T extends { slug: string }>(itens: T[], slugParts: string[]): T | null {
  const alvo = slugParts.join('/')
  return itens.find((i) => i.slug === alvo) ?? null
}
