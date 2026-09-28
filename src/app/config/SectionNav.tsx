'use client'



import { CONFIG_SECTIONS, sectionStatus, type ConfigSectionId, type EssentialFlags } from '@/lib/config-sections'


function KeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="5.6" cy="5.6" r="3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7.7 7.7 12.6 12.6M10.5 11.3 11.9 9.9M11.8 12.6 13.1 11.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function BoltIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8.7 2 4 9h3.4l-.6 5L12 6.6H8.6L8.7 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
function BroadcastIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="1.3" fill="currentColor" />
      <path d="M5.3 5.3a3.9 3.9 0 0 0 0 5.4M10.7 5.3a3.9 3.9 0 0 1 0 5.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3.5 3.5a6.4 6.4 0 0 0 0 9M12.5 3.5a6.4 6.4 0 0 1 0 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2 13 4v4c0 3-2.2 4.9-5 6-2.8-1.1-5-3-5-6V4l5-2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M5.9 8 7.3 9.4 10 6.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ToggleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.5" y="5" width="11" height="6" rx="3" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10" cy="8" r="1.7" fill="currentColor" />
    </svg>
  )
}
function CoinIcon() {
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 4.5v7M6 6h3a1 1 0 0 1 0 2H7a1 1 0 0 0 0 2h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function PeopleIcon() {
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="6" cy="5.4" r="2.3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.2 13c0-2.3 1.7-3.8 3.8-3.8s3.8 1.5 3.8 3.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10.6 3.5a2.3 2.3 0 0 1 0 4.2M11.3 9.4c1.6.4 2.5 1.8 2.5 3.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function DatabaseIcon() {
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <ellipse cx="8" cy="4" rx="4.8" ry="1.9" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3.2 4v8c0 1 2.1 1.9 4.8 1.9s4.8-.9 4.8-1.9V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3.2 8c0 1 2.1 1.9 4.8 1.9s4.8-.9 4.8-1.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}


function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2.5 14 13H2L8 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 6.5v3M8 11v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

const SECTION_ICON: Record<ConfigSectionId, () => React.ReactElement> = {
  essenciais: KeyIcon,
  acoesExternas: BoltIcon,
  canais: BroadcastIcon,
  fontes: DatabaseIcon,
  licenca: ShieldIcon,
  preferencias: ToggleIcon,
  custo: CoinIcon,
  equipe: PeopleIcon,
  perigo: AlertIcon,
}

export function SectionNav({
  active,
  onSelect,
  flags,
  updateAvailable,
  isDono,
}: {
  active: ConfigSectionId
  onSelect: (id: ConfigSectionId) => void
  flags: EssentialFlags
  updateAvailable?: boolean
  
  isDono?: boolean
}) {
  
  
  
  
  const DONO_EXCLUSIVAS = new Set(['perigo', 'fontes'])
  const visibleSections = CONFIG_SECTIONS.filter(
    (s) => !DONO_EXCLUSIVAS.has(s.id) || isDono,
  )

  return (
    <nav className="config-nav" aria-label="Seções da configuração">
      {}
      <span className="config-nav__eyebrow">Configuração</span>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
          margin: '0 4px 20px', padding: '4px 11px', borderRadius: 999,
          background: 'rgb(40 224 200 / 0.07)',
          border: '1px solid rgb(40 224 200 / 0.18)',
          fontSize: 12, color: 'var(--wave-from)',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6, height: 6, borderRadius: 999,
            background: 'var(--wave-from)',
            animation: 'awave-live-dot 2.4s ease-in-out infinite',
          }}
        />
        Empresa ativa
      </span>

      {}
      <div className="config-nav__list">
        {visibleSections.map((s) => {
          const status = sectionStatus(s.id, flags)
          const Icon = SECTION_ICON[s.id]
          return (
            <button
              key={s.id}
              type="button"
              className="config-nav__item"
              aria-current={active === s.id ? 'true' : undefined}
              onClick={() => onSelect(s.id)}
            >
              <span className="config-nav__ico" aria-hidden><Icon /></span>
              <span className="config-nav__label">{s.label}</span>
              {s.id === 'licenca' && updateAvailable && (
                <span
                  aria-label="Atualização disponível" title="Atualização disponível"
                  style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: 999,
                    background: 'var(--wave-from)', animation: 'awave-live-dot 2.4s ease-in-out infinite' }}
                />
              )}
              {status === 'pending' && (
                <span className="config-nav__pending">
                  <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }} />
                  pendente
                </span>
              )}
              {status === 'done' && <span className="config-nav__check" aria-hidden>✓</span>}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
