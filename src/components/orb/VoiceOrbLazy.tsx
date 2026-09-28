'use client'

import dynamic from 'next/dynamic'


export type { OrbState } from './VoiceOrb'

export const VoiceOrb = dynamic(
  () => import('./VoiceOrb').then((m) => m.VoiceOrb),
  { ssr: false },
)
