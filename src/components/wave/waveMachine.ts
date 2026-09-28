

export type WaveState = 'idle' | 'listening' | 'thinking' | 'acting'


export interface PulseEvent {
  
  id: string
  
  t: number
}


export interface ActiveRipple {
  id: string
  
  t: number
  
  age: number
  
  progress: number
}

export interface WaveMachine {
  
  readonly state: WaveState
  
  readonly amplitude: number
  
  setListening(amp: number): void
  
  setThinking(on?: boolean): void
  
  pulse(e: PulseEvent): void
  
  activeRipples(): ActiveRipple[]
  
  tick(nowMs: number): void
}


export const RIPPLE_LIFETIME = 600

export const RIPPLE_STAGGER = 120

export const MAX_ACTIVE_RIPPLES = Math.round(RIPPLE_LIFETIME / RIPPLE_STAGGER) 


export const LIMIAR_DE_ESCUTA = 0.01

interface InternalRipple {
  id: string
  
  birth: number
}

export function createWaveMachine(): WaveMachine {
  let amplitude = 0
  let thinking = false
  let ripples: InternalRipple[] = []
  let now = 0
  
  let lastBirth = -Infinity
  let state: WaveState = 'idle'

  function clamp01(n: number): number {
    if (Number.isNaN(n)) return 0
    if (n < 0) return 0
    if (n > 1) return 1
    return n
  }

  
  function expire(): void {
    if (ripples.length === 0) return
    ripples = ripples.filter((r) => now - r.birth < RIPPLE_LIFETIME)
  }

  
  function recompute(): void {
    if (amplitude > LIMIAR_DE_ESCUTA) state = 'listening'
    else if (ripples.length > 0) state = 'acting'
    else if (thinking) state = 'thinking'
    else state = 'idle'
  }

  function setListening(amp: number): void {
    amplitude = clamp01(amp)
    recompute()
  }

  function setThinking(on: boolean = true): void {
    thinking = on
    recompute()
  }

  function pulse(e: PulseEvent): void {
    
    if (e.t > now) now = e.t
    expire()

    
    
    const staggered = Math.max(e.t, lastBirth + RIPPLE_STAGGER)
    lastBirth = staggered

    ripples.push({ id: e.id, birth: staggered })

    
    
    if (ripples.length > MAX_ACTIVE_RIPPLES) {
      ripples = ripples.slice(ripples.length - MAX_ACTIVE_RIPPLES)
    }

    recompute()
  }

  function activeRipples(): ActiveRipple[] {
    
    
    const ref = lastBirth === -Infinity ? now : Math.max(now, lastBirth)
    const out: ActiveRipple[] = []
    for (const r of ripples) {
      const age = ref - r.birth
      if (age < RIPPLE_LIFETIME) {
        out.push({
          id: r.id,
          t: r.birth,
          age: Math.max(0, age),
          progress: clamp01(age / RIPPLE_LIFETIME),
        })
      }
    }
    return out
  }

  function tick(nowMs: number): void {
    if (nowMs > now) now = nowMs
    expire()
    recompute()
  }

  return {
    get state() {
      return state
    },
    get amplitude() {
      return amplitude
    },
    setListening,
    setThinking,
    pulse,
    activeRipples,
    tick,
  }
}
