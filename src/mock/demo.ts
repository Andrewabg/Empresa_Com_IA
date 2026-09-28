

import type { DemoStep, LiveEvent } from './types'
import type { EventBus } from './eventBus'

export type { DemoStep }


export interface Clock {
  set: (fn: () => void, ms: number) => number
  clear: (id: number) => void
}


export function buildUauSequence(): DemoStep[] {
  return [
    {
      at: 0,
      kind: 'user_speaks',
      payload: { text: 'Nathan, registra a decisão de preço que acabamos de tomar.' },
    },
    {
      at: 200,
      kind: 'wave_listening',
      payload: { kind: 'listening', amp: 0.7 },
    },
    {
      at: 1_800,
      kind: 'wave_thinking',
      payload: { kind: 'thinking' },
    },
    {
      at: 2_400,
      kind: 'action_taken',
      payload: {
        label: 'Decisão de preço identificada — preparando nota',
        agent: 'curator-agent',
      },
    },
    {
      at: 3_200,
      kind: 'memory_born',
      payload: {
        id: 'live-demo-001',
        type: 'memory' as const,
        label: 'Nova memória: decisão de preço do Plano Pro registrada',
        at: 3_200,
        agent: 'curator-agent', 
      },
    },
    {
      at: 4_100,
      kind: 'curator_organizes',
      payload: {
        id: 'live-demo-002',
        type: 'action' as const,
        label: 'Curador organizou a memória em Projetos/Awave/estrategia-precos.md',
        at: 4_100,
        agent: 'curator-agent', 
      },
    },
    {
      at: 5_200,
      kind: 'commit',
      payload: {
        id: 'live-demo-003',
        type: 'action' as const,
        label: 'Commit realizado no cérebro: "feat(prices): plano Pro → R$ 497"',
        at: 5_200,
        agent: 'jarvis', 
      },
    },
    {
      at: 5_500,
      kind: 'wave_pulse',
      payload: { kind: 'pulse', id: 'live-demo-003', amp: 0.9 },
    },
    {
      at: 7_000,
      kind: 'wave_idle',
      payload: { kind: 'idle' },
    },
  ]
}


export function playUau(bus: EventBus, clock: Clock): void {
  const steps = buildUauSequence()

  for (const step of steps) {
    clock.set(() => {
      switch (step.kind) {
        case 'wave_listening':
        case 'wave_thinking':
        case 'wave_pulse':
        case 'wave_idle':
          bus.emit('wave', step.payload as Parameters<EventBus['emit']>[1] & { kind: 'pulse' | 'listening' | 'thinking' | 'idle' })
          break

        case 'memory_born':
        case 'curator_organizes':
        case 'commit': {
          const p = step.payload as LiveEvent
          bus.emit('live', p)
          
          bus.emit('wave', { kind: 'pulse', id: p.id, amp: 0.6 })
          break
        }

        case 'user_speaks':
          
          
          bus.emit('wave', { kind: 'listening', amp: 0.3 })
          break

        case 'action_taken':
          
          bus.emit('wave', { kind: 'thinking' })
          break

        default:
          break
      }
    }, step.at)
  }
}
