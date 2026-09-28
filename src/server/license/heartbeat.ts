import { heartbeat } from '@/server/hub/client'


export async function runLicenseHeartbeat(): Promise<void> {
  try {
    await heartbeat()
  } catch {
    
  }
}
