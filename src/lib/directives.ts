
export interface Diretriz {
  texto: string
  origem: 'operador' | 'reflector'
  at: string 
  
  substitui?: string
}


export const DIRETRIZES_CAP = 25

export const norm = (s: string): string => s.trim().toLowerCase()


export function textosSubstituidos(lista: readonly { texto: string; substitui?: string }[]): Set<string> {
  return new Set(
    lista
      .filter((d) => d.substitui && norm(d.substitui) !== norm(d.texto))
      .map((d) => norm(d.substitui!)),
  )
}


function podarAoTeto(lista: Diretriz[], cap: number): Diretriz[] {
  if (lista.length <= cap) return lista
  const out = [...lista]
  while (out.length > cap) {
    
    const substituidas = textosSubstituidos(out)
    const i = out.findIndex((d) => substituidas.has(norm(d.texto)))
    out.splice(i >= 0 ? i : 0, 1)
  }
  return out
}


export function sanearSupersessao(lista: Diretriz[]): Diretriz[] {
  let mudou = false
  const out = lista.map((d, i) => {
    if (!d.substitui) return d
    const alvo = norm(d.substitui)
    if (lista.slice(0, i).some((x) => norm(x.texto) === alvo)) return d
    mudou = true
    const { substitui: _solto, ...resto } = d
    return resto as Diretriz
  })
  return mudou ? out : lista
}


function aplicarInvariante(lista: Diretriz[], cap: number): Diretriz[] {
  return sanearSupersessao(podarAoTeto(lista, cap))
}


export function addDiretriz(
  atual: Diretriz[],
  nova: Diretriz,
  opts: { cap: number; substituindo?: string },
): Diretriz[] {
  const texto = nova.texto.trim()
  if (!texto) return atual
  if (atual.some((x) => norm(x.texto) === norm(texto))) return atual 
  const alvo = opts.substituindo?.trim()
  const substitui =
    alvo && norm(alvo) !== norm(texto) && atual.some((x) => norm(x.texto) === norm(alvo))
      ? alvo
      : undefined
  const next = [...atual, { ...nova, texto, ...(substitui ? { substitui } : {}) }]
  return aplicarInvariante(next, opts.cap)
}


export function diretrizesAtivas(lista: Diretriz[]): Diretriz[] {
  const substituidas = textosSubstituidos(lista)
  return lista.filter((d) => !substituidas.has(norm(d.texto)))
}


export function consolidarDiretrizes(lista: Diretriz[], cap: number): Diretriz[] {
  const out: Diretriz[] = []
  const seen = new Set<string>()
  for (const x of lista) {
    const t = x.texto.trim()
    if (!t || seen.has(norm(t))) continue
    seen.add(norm(t))
    out.push({ ...x, texto: t })
  }
  return aplicarInvariante(out, cap)
}


export function candidatasASubstituicao(lista: Diretriz[]): Diretriz[] {
  return diretrizesAtivas(lista).filter((d) => d.origem === 'reflector')
}


export function resolverSubstituicao(
  lista: Diretriz[],
  eco: string | undefined,
  textoNovo: string,
): string | undefined {
  const alvo = norm(eco ?? '')
  if (!alvo || alvo === norm(textoNovo)) return undefined
  return candidatasASubstituicao(lista).find((d) => norm(d.texto) === alvo)?.texto
}
