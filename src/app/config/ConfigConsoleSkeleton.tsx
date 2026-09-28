'use client'



import { Skeleton } from '@/components/ui/Skeleton'

export function ConfigConsoleSkeleton() {
  return (
    <div className="config-shell">
      {}
      <div className="config-nav">
        <div style={{ padding: '0 8px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton width={90} height={11} />
          <Skeleton width={120} height={24} radius={999} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={34} radius="var(--radius-sm)" />
          ))}
        </div>
      </div>
      {}
      <div className="config-pane">
        <div className="config-pane__inner">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 8 }}>
            <Skeleton width={220} height={26} />
            <Skeleton width="70%" height={14} />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton width={160} height={11} />
              <Skeleton width="100%" height={44} radius="var(--radius-md)" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
