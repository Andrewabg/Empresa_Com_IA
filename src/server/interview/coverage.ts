import { serverDb } from '@/server/supabase'
import { getSetting } from '@/data/settings'
import { TOPICS, MANDATORY, type Topic } from './topics'

export const SNOOZE_KEY = 'interview_snooze_until'

export interface Coverage {
  covered: string[]
  remaining: Topic[]
  mandatoryRemaining: Topic[]
  minDone: boolean
}

export interface CoverageDeps {
  fetchTaggedNotes: (tags: string[]) => Promise<{ tags: string[] }[]>
  getSnoozeUntil: () => Promise<string | null>
  now: () => Date
}

const defaultDeps: CoverageDeps = {
  fetchTaggedNotes: async (tags) => {
    const { data, error } = await serverDb().from('notes').select('tags').overlaps('tags', tags)
    if (error) throw new Error(`coverage fetchTaggedNotes: ${error.message}`)
    return (data ?? []) as { tags: string[] }[]
  },
  getSnoozeUntil: () => getSetting(SNOOZE_KEY),
  now: () => new Date(),
}

export async function coverage(deps: CoverageDeps = defaultDeps): Promise<Coverage> {
  const rows = await deps.fetchTaggedNotes(TOPICS.map((t) => t.tag))
  const present = new Set<string>()
  for (const row of rows) for (const tag of row.tags ?? []) present.add(tag)
  const coveredSet = new Set(TOPICS.filter((t) => present.has(t.tag)).map((t) => t.id))
  const remaining = TOPICS.filter((t) => !coveredSet.has(t.id))
  const mandatoryRemaining = MANDATORY.filter((t) => !coveredSet.has(t.id))
  return { covered: [...coveredSet], remaining, mandatoryRemaining, minDone: mandatoryRemaining.length === 0 }
}

export async function interviewNeeded(deps: CoverageDeps = defaultDeps): Promise<boolean> {
  return !(await coverage(deps)).minDone
}

export async function isSnoozed(deps: CoverageDeps = defaultDeps): Promise<boolean> {
  const snooze = await deps.getSnoozeUntil()
  if (!snooze) return false
  const until = new Date(snooze).getTime()
  return !Number.isNaN(until) && deps.now().getTime() < until
}
