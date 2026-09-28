
import { getSetting } from '@/data/settings'
import { memoizeAsync } from '@/server/cache/ttlMemoize'
import { parseAtalhosRail, ATALHOS_SETTING_KEY, type Atalho } from '@/lib/atalhosRail'

async function getAtalhosRailUncached(): Promise<Atalho[]> {
  try {
    const raw = await getSetting(ATALHOS_SETTING_KEY)
    return parseAtalhosRail(raw)
  } catch (e) {
    console.warn('[atalhosRail] leitura dos settings falhou (fail-open → vazio):', e)
    return []
  }
}

const _atalhosRailMemo = memoizeAsync(getAtalhosRailUncached, 60_000)

export async function getAtalhosRail(): Promise<Atalho[]> {
  return _atalhosRailMemo.get()
}


export function invalidateAtalhosRailCache(): void {
  _atalhosRailMemo.invalidate()
}
