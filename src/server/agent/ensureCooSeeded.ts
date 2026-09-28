
let _seeded = false


export function _resetCooSeed(): void {
  _seeded = false
}

export interface EnsureCooDeps {
  
  seed?: () => Promise<void>
}

async function defaultSeed(): Promise<void> {
  
  
  const { ensureSeedRoster } = await import('@/data/agents')
  const { SEED_COO_AGENT } = await import('./maestro/cooPersona')
  await ensureSeedRoster([SEED_COO_AGENT])
}


export async function ensureCooSeeded(deps: EnsureCooDeps = {}): Promise<void> {
  if (_seeded) return
  try {
    await (deps.seed ?? defaultSeed)()
    _seeded = true 
  } catch (err) {
    console.warn('[ensureCooSeeded] backfill best-effort falhou (segue; chat/birth cobre):', err)
  }
}
