


export interface StepLike {
  ordinal: number
  depends_on: number[]
  status: 'pending' | 'delegated' | 'done' | 'failed' | 'skipped'
}


export function passosProntos(steps: StepLike[]): number[] {
  const statusPorOrdinal = new Map<number, StepLike['status']>()
  for (const s of steps) statusPorOrdinal.set(s.ordinal, s.status)

  const out: number[] = []
  for (const s of steps) {
    if (s.status !== 'pending') continue
    const todosDeps = s.depends_on.every((d) => statusPorOrdinal.get(d) === 'done')
    if (todosDeps) out.push(s.ordinal)
  }
  return out
}


export function ondaCompleta(steps: StepLike[]): boolean {
  return !steps.some((s) => s.status === 'delegated')
}


export function tudoConcluido(steps: StepLike[]): boolean {
  return !steps.some((s) => s.status === 'pending' || s.status === 'delegated')
}


export function detectarCiclo(steps: StepLike[]): boolean {
  const deps = new Map<number, number[]>()
  for (const s of steps) deps.set(s.ordinal, s.depends_on)

  const WHITE = 0
  const GRAY = 1
  const BLACK = 2
  const cor = new Map<number, number>()
  for (const s of steps) cor.set(s.ordinal, WHITE)

  function dfs(n: number): boolean {
    cor.set(n, GRAY)
    for (const d of deps.get(n) ?? []) {
      if (!cor.has(d)) continue 
      const c = cor.get(d)
      if (c === GRAY) return true 
      if (c === WHITE && dfs(d)) return true
    }
    cor.set(n, BLACK)
    return false
  }

  for (const s of steps) {
    if (cor.get(s.ordinal) === WHITE && dfs(s.ordinal)) return true
  }
  return false
}


export function passosBloqueados(steps: StepLike[]): number[] {
  const statusPorOrdinal = new Map<number, StepLike['status']>()
  for (const s of steps) statusPorOrdinal.set(s.ordinal, s.status)

  const out: number[] = []
  for (const s of steps) {
    if (s.status !== 'pending') continue
    const temDepRuim = s.depends_on.some((d) => {
      const st = statusPorOrdinal.get(d)
      return st === 'failed' || st === 'skipped'
    })
    if (temDepRuim) out.push(s.ordinal)
  }
  return out
}


export function orcamentoEstourado(spentTotal: number, cap: number | null): boolean {
  return cap != null && spentTotal >= cap
}


export interface PlanoProposto {
  ordinal: number
  role: string
  sub_objective: string
  depends_on: number[]
}

export type ValidacaoPlano = { ok: true } | { ok: false; erro: string }


export function validarPlano(steps: PlanoProposto[]): ValidacaoPlano {
  if (steps.length === 0) {
    return { ok: false, erro: 'O plano precisa de pelo menos um passo.' }
  }

  const ordinais = new Set<number>()
  for (const s of steps) {
    if (s.role.trim() === '') {
      return { ok: false, erro: `O passo ${s.ordinal} está sem cargo (role).` }
    }
    if (s.sub_objective.trim() === '') {
      return { ok: false, erro: `O passo ${s.ordinal} está sem sub-objetivo.` }
    }
    if (ordinais.has(s.ordinal)) {
      return { ok: false, erro: `Ordinal duplicado: ${s.ordinal}. Os ordinais devem ser únicos.` }
    }
    ordinais.add(s.ordinal)
  }

  for (const s of steps) {
    for (const d of s.depends_on) {
      if (!ordinais.has(d)) {
        return {
          ok: false,
          erro: `O passo ${s.ordinal} depende do ordinal ${d}, que não existe no plano.`,
        }
      }
    }
  }

  
  const comoSteps: StepLike[] = steps.map((s) => ({
    ordinal: s.ordinal,
    depends_on: s.depends_on,
    status: 'pending',
  }))
  if (detectarCiclo(comoSteps)) {
    return { ok: false, erro: 'O plano tem um ciclo de dependências (deadlock).' }
  }

  return { ok: true }
}
