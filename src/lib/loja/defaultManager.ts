
export function escolherGerenteDefault(
  managers: ReadonlyArray<{ id: string }>,
  sugerido?: string | null,
): string {
  if (sugerido && managers.some((m) => m.id === sugerido)) return sugerido
  if (managers.some((m) => m.id === 'coo')) return 'coo'
  if (managers.some((m) => m.id === 'jarvis')) return 'jarvis'
  return managers[0]?.id ?? ''
}
