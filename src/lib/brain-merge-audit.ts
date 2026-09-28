

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()


export function mergeTrivialmenteAditivo(
  beforeBody: string | null | undefined,
  proposedBody: string,
): boolean {
  const before = norm(beforeBody ?? '')
  if (!before) return true
  return norm(proposedBody).includes(before)
}


export function deveAuditarMerge(args: {
  gateOk: boolean
  beforeBody: string | null | undefined
  proposedBody: string
}): boolean {
  if (!args.gateOk) return true
  return !mergeTrivialmenteAditivo(args.beforeBody, args.proposedBody)
}


export function clampBody(body: string, budget = 1200): string {
  const b = body ?? ''
  if (b.length <= budget) return b
  const head = Math.ceil(budget * 0.6)
  const tail = budget - head
  const cortado = b.length - budget
  return `${b.slice(0, head)}\n${marcaDeOmissao(cortado)}\n${b.slice(b.length - tail)}`
}


function marcaDeOmissao(chars: number): string {
  return `… [${chars} chars omitidos] …`
}


export function contemMarcaDeOmissao(texto: string | null | undefined): boolean {
  return acharMarcaDeOmissao(texto) !== null
}


export function acharMarcaDeOmissao(texto: string | null | undefined): string | null {
  return (texto ?? '').match(/\[\d+ chars omitidos\]/)?.[0] ?? null
}
