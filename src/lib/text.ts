



const STOP = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas',
  'um', 'uma', 'que', 'qual', 'quais', 'pra', 'para', 'por', 'com', 'sem', 'se', 'ao', 'aos',
  'voce', 'voces', 'vcs', 'meu', 'minha', 'seu', 'sua', 'me', 'te', 'the',
])


export function tokenizar(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t))
}


export function acerta(qt: string, ct: string): boolean {
  if (qt === ct) return true
  if (qt.length >= 4 && ct.length >= 4 && (ct.startsWith(qt) || qt.startsWith(ct))) return true
  return false
}


export function sobreposicao(pergunta: string, conteudo: string): number {
  const qs = [...new Set(tokenizar(pergunta))]
  const cs = tokenizar(conteudo)
  let n = 0
  for (const qt of qs) if (cs.some((ct) => acerta(qt, ct))) n++
  return n
}
