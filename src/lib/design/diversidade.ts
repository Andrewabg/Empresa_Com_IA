










export interface PecaComArquetipos {
  
  versoes?: { variacoes?: unknown }[] | null
  
  ultimaVersao?: { variacoes?: unknown } | null
}


export const TETO_DE_RECENTES = 6

function arquetiposDaVersao(versao: { variacoes?: unknown } | null | undefined): string[] {
  const vars = versao?.variacoes
  if (!Array.isArray(vars)) return []
  const out: string[] = []
  for (const v of vars) {
    const slug = (v as { arquetipo?: unknown })?.arquetipo
    if (typeof slug === 'string' && slug.trim()) out.push(slug.trim().toLowerCase())
  }
  return out
}


export function arquetiposRecentes(
  pecas: PecaComArquetipos[] | null | undefined, teto = TETO_DE_RECENTES,
): string[] {
  const out: string[] = []
  const vistos = new Set<string>()
  for (const p of pecas ?? []) {
    const versao = p?.ultimaVersao ?? (Array.isArray(p?.versoes) ? p.versoes[p.versoes.length - 1] : null)
    for (const slug of arquetiposDaVersao(versao)) {
      if (vistos.has(slug)) continue
      vistos.add(slug)
      out.push(slug)
      if (out.length >= teto) return out
    }
  }
  return out
}


export function linhaDeNaoRepetir(recentes: string[]): string {
  if (!recentes.length) return ''
  return (
    `JÁ USADOS recentemente nesta marca, NÃO repita nenhum deles: ${recentes.join(', ')}. ` +
    'A biblioteca tem outros formatos; escolha entre os que sobraram.'
  )
}
