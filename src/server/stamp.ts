import 'server-only'
import raw from './awave-stamp.json'
import { parseStamp, type Stamp } from '@/lib/stamp'
export function getStamp(): Stamp | null {
  return parseStamp(raw)
}
