
import { getSetting } from '@/data/settings'
import { memoizeAsync } from '@/server/cache/ttlMemoize'
import { FUSO_SETTING_KEY, TZ_DEFAULT, validarTz } from '@/lib/tempo/fusoDoDono'

const TTL_MS = 5 * 60_000

const memo = memoizeAsync<string>(
  async () => validarTz((await getSetting(FUSO_SETTING_KEY)) ?? TZ_DEFAULT),
  TTL_MS,
)


export async function fusoDoDonoMemoizado(): Promise<string> {
  try {
    return await memo.get()
  } catch {
    return TZ_DEFAULT
  }
}


export function _invalidarFusoMemo(): void {
  memo.invalidate()
}
