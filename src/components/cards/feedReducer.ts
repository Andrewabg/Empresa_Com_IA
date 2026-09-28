

import type { LiveEvent } from '@/mock/types'


export const FEED_MAX = 30


export function addEvent(
  events: readonly LiveEvent[],
  next: LiveEvent,
  max: number = FEED_MAX,
): LiveEvent[] {
  if (events.some((e) => e.id === next.id)) return events as LiveEvent[]
  const out = [next, ...events]
  return out.length > max ? out.slice(0, max) : out
}


export function seedFeed(seed: readonly LiveEvent[], max: number = FEED_MAX): LiveEvent[] {
  const sorted = [...seed].sort((a, b) => b.at - a.at)
  return sorted.length > max ? sorted.slice(0, max) : sorted
}
