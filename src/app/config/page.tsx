'use client'



import { useConfigController } from './useConfigController'
import { ConfigConsole } from './ConfigConsole'
import { ConfigConsoleSkeleton } from './ConfigConsoleSkeleton'

export default function ConfigPage() {
  const { ctrl, loading, fetchError } = useConfigController()

  
  if (loading) {
    return <ConfigConsoleSkeleton />
  }

  
  
  if (fetchError) {
    return (
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 'clamp(48px, 8vh, 96px)', paddingBottom: 48 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 560, padding: '0 24px' }}>
          <div role="alert" style={{ padding: '14px 18px', background: 'rgb(229 99 77 / 0.08)', border: '1px solid rgb(229 99 77 / 0.2)', borderRadius: 'var(--radius-md)', fontSize: 14, color: 'var(--reject)', lineHeight: 1.5 }}>
            {fetchError}
          </div>
        </div>
      </div>
    )
  }

  
  
  return <ConfigConsole ctrl={ctrl} />
}
