

import type { LiveEvent } from './types'


export interface WaveEvent {
  kind: 'pulse' | 'listening' | 'thinking' | 'idle'
  id?: string
  amp?: number
}


interface EventMap {
  live: LiveEvent
  wave: WaveEvent
}

type Topic = keyof EventMap
type Callback<T extends Topic> = (payload: EventMap[T]) => void

export interface EventBus {
  
  on<T extends Topic>(topic: T, cb: Callback<T>): () => void
  
  emit<T extends Topic>(topic: T, payload: EventMap[T]): void
}

export function createEventBus(): EventBus {
  
  const subscribers = new Map<Topic, Set<Callback<never>>>()

  function getSet<T extends Topic>(topic: T): Set<Callback<T>> {
    if (!subscribers.has(topic)) {
      subscribers.set(topic, new Set())
    }
    return subscribers.get(topic) as Set<Callback<T>>
  }

  return {
    on<T extends Topic>(topic: T, cb: Callback<T>): () => void {
      getSet(topic).add(cb)
      return () => {
        getSet(topic).delete(cb)
      }
    },

    emit<T extends Topic>(topic: T, payload: EventMap[T]): void {
      for (const cb of getSet(topic)) {
        cb(payload)
      }
    },
  }
}
