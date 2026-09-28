


export type ImportTargetResolved =
  | { target: 'cerebro'; baseAgentId: null }
  | { target: 'base'; baseAgentId: string | null }
  | { error: 'agente_invalido' }


export function resolveImportTarget(
  rawTarget: string | null,
  rawBaseAgent: string,
  canalAgentIds: string[],
): ImportTargetResolved {
  if ((rawTarget ?? '').trim() !== 'base') return { target: 'cerebro', baseAgentId: null }
  const escopo = (rawBaseAgent ?? '').trim()
  if (!escopo) return { target: 'base', baseAgentId: null }
  if (!canalAgentIds.includes(escopo)) return { error: 'agente_invalido' }
  return { target: 'base', baseAgentId: escopo }
}
