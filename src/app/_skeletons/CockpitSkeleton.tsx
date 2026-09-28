
import type { CSSProperties } from 'react'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'




export function BriefingSkeleton() {
  return (
    <section aria-label="Carregando briefing">
      <Skeleton width={180} height={11} style={{ marginBottom: 16 }} />
      <Skeleton width="48%" height={32} radius="var(--radius-md)" style={{ marginBottom: 22 }} />
      <div style={{ maxWidth: 560 }}>
        <SkeletonText lines={3} lineHeight={16} gap={11} />
      </div>
    </section>
  )
}


export function SideSkeleton({ label }: { label: string }) {
  return (
    <section aria-label={`Carregando ${label}`}>
      <Skeleton width={120} height={11} style={{ marginBottom: 16 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton width="100%" height={52} radius="var(--radius-md)" />
        <Skeleton width="100%" height={52} radius="var(--radius-md)" />
      </div>
    </section>
  )
}




function PanelShell({ children, fill = false }: { children: React.ReactNode; fill?: boolean }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(18px, 2vw, 26px)',
        ...(fill
          ? {
              flex: '1 1 0',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }
          : {}),
      }}
    >
      {children}
    </div>
  )
}


const sectionLabel: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-tertiary)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  margin: 0,
  marginBottom: 12,
}




export function CockpitSkeleton() {
  return (
    <div className="cc-page">
      {}
      <div className="cc-hero">
        <Skeleton width="100%" height={56} radius="var(--radius-md)" />
        <BriefingSkeleton />
      </div>

      {}
      <section aria-label="Carregando equipe" style={{ flex: 'none' }}>
        <p style={sectionLabel}>Sua equipe</p>
        <div style={{ display: 'flex', gap: 12, overflow: 'hidden' }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                width: 264,
                flex: '0 0 auto',
              }}
            >
              <Skeleton width={48} height={48} radius={12} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton height={13} width="55%" />
                <Skeleton height={10} width="40%" />
                <Skeleton height={11} width="80%" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {}
      <div className="cc-main">
        <PanelShell fill>
          <Skeleton width={80} height={11} style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} width="100%" height={48} radius="var(--radius-md)" />
            ))}
          </div>
        </PanelShell>
        <PanelShell fill>
          <SideSkeleton label="Precisa de você" />
        </PanelShell>
      </div>
    </div>
  )
}


export function NeutralSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Carregando" style={{ padding: 'clamp(24px, 3vw, 40px)', maxWidth: 520 }}>
      <Skeleton
        width="52%"
        height={24}
        radius="var(--radius-md)"
        style={{ marginBottom: 18 }}
      />
      <SkeletonText lines={2} lineHeight={14} gap={11} />
    </div>
  )
}


export function EstudioSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '100%', overflow: 'hidden' }}
    >
      {}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border-hairline)' }}>
        <Skeleton circle height={26} />
        <Skeleton width={150} height={13} />
        <div style={{ marginLeft: 'auto' }}>
          <Skeleton width={92} height={30} radius="var(--radius-md)" />
        </div>
      </div>

      {}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', width: '100%' }}>
        {}
        <div style={{ flex: '2.1 1 0%', minWidth: 0, minHeight: 0, overflow: 'hidden', padding: 'clamp(16px, 2.5vw, 28px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Skeleton width="38%" height={20} radius="var(--radius-md)" />
          <Skeleton width="100%" height={132} radius="var(--radius-lg)" />
          <Skeleton width="100%" height={220} radius="var(--radius-lg)" />
        </div>

        {}
        <div style={{ width: 'min(420px, 34%)', flexShrink: 0, minHeight: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-hairline)' }}>
          {}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border-hairline)', flexShrink: 0 }}>
            <Skeleton circle height={44} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton width={92} height={12} />
              <Skeleton width={58} height={9} />
            </div>
          </div>
          {}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Skeleton width="72%" height={40} radius="var(--radius-md)" />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Skeleton width="54%" height={30} radius="var(--radius-md)" /></div>
            <Skeleton width="82%" height={54} radius="var(--radius-md)" />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Skeleton width="44%" height={28} radius="var(--radius-md)" /></div>
          </div>
          {}
          <div style={{ flexShrink: 0, padding: 'clamp(12px, 1.4vw, 18px)', borderTop: '1px solid var(--border-hairline)' }}>
            <Skeleton width="100%" height={44} radius="var(--radius-md)" />
          </div>
        </div>
      </div>
    </div>
  )
}


export function CerebroSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando"
      style={{ maxWidth: 920, margin: '0 auto', padding: 'clamp(32px, 5vw, 64px) clamp(24px, 5vw, 48px) 96px' }}
    >
      <Skeleton width={80} height={11} style={{ marginBottom: 14 }} />
      <Skeleton width="52%" height={32} radius="var(--radius-md)" style={{ marginBottom: 16 }} />
      <div style={{ maxWidth: 560, marginBottom: 28 }}>
        <SkeletonText lines={2} lineHeight={14} gap={10} />
      </div>
      {}
      <Skeleton width="100%" height={46} radius="var(--radius-lg)" style={{ marginBottom: 14 }} />
      <Skeleton width={120} height={11} style={{ marginBottom: 28 }} />
      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(28px, 3.5vw, 40px)' }}>
        {[0, 1].map((g) => (
          <div key={g}>
            <Skeleton width={160} height={13} style={{ marginBottom: 14 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} width="100%" height={56} radius="var(--radius-md)" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


export function OrganogramaSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando"
      style={{ maxWidth: 1760, margin: '0 auto', padding: '28px clamp(24px, 3vw, 44px) 64px' }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 40 }}>
        <Skeleton width={220} height={30} radius="var(--radius-md)" />
        <div style={{ marginLeft: 'auto' }}>
          <Skeleton width={88} height={22} radius={999} />
        </div>
      </div>
      {}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 44 }}>
        <Skeleton width={200} height={92} radius="var(--radius-lg)" />
        <div style={{ display: 'flex', gap: '44px 28px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width={200} height={92} radius="var(--radius-lg)" />
          ))}
        </div>
      </div>
    </div>
  )
}
