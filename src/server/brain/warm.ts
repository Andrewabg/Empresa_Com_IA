
import type { Brain } from './runtime'

export interface WarmDeps {
  getBrain?: () => Promise<Brain>
}

export async function warmBrain(deps: WarmDeps = {}): Promise<void> {
  try {
    const getBrain = deps.getBrain ?? (await import('./runtime')).getBrain
    await getBrain()
  } catch (e) {
    
    
    console.warn('[warmBrain] aquecimento do Cérebro pulado (não-fatal):', (e as Error)?.message ?? e)
  }
}
