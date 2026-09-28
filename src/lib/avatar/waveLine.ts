






export const HERO_WAVE_ID = 'awave-hero'


export const HERO_WAVE = { width: 1200, height: 72, points: 160 } as const


export function heroBreath(tSec: number): number {
  return 0.81 + 0.19 * Math.sin(tSec * 2 * Math.PI * 0.06)
}


export function heroPulseBoost(msSincePulse: number | null): number {
  if (msSincePulse === null || msSincePulse < 0) return 0
  return 1.8 * Math.exp(-msSincePulse / 430)
}


export function heroWaveAmplitude(tSec: number, msSincePulse: number | null): number {
  return heroBreath(tSec) * (1 + heroPulseBoost(msSincePulse))
}
