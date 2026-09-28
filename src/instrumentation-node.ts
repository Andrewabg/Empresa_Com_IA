
import { contractRevisionCount } from '@/lib/contract-revisions'
import { presentationRevisionCount } from '@/lib/presentation-revisions'
import { runtimeRevisionCount } from '@/server/runtime-revisions'



const total = contractRevisionCount() + presentationRevisionCount() + runtimeRevisionCount()
if (total === 0) {
  console.warn('[boot] revisões de schema ausentes — build possivelmente incompleto')
}




if (process.env.BRAIN_WARM_ON_BOOT !== '0') {
  import('@/server/brain/warm').then(({ warmBrain }) => warmBrain()).catch(() => {})
}
