import type { SkillMeta } from './types'




function CheckBox({ checked, onChange, label }: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, marginTop: 1 }}>
      <input
        type="checkbox"
        checked={checked}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          margin: 0,
          width: 17,
          height: 17,
          borderRadius: 5,
          border: `1px solid ${checked ? 'rgb(40 224 200 / 0.5)' : 'var(--border-hairline)'}`,
          background: checked
            ? 'linear-gradient(120deg, var(--wave-from), var(--wave-to))'
            : 'var(--surface-elevated)',
          cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      />
      {checked && (
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          aria-hidden
          style={{ position: 'absolute', top: 3, left: 3, pointerEvents: 'none' }}
        >
          <path d="M2 6.2l2.6 2.6L10 3.2" stroke="var(--bg-base)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}



export function SkillsCard({ catalog, catalogState, skillsSel, onToggle }: {
  catalog: SkillMeta[]
  catalogState: 'loading' | 'loaded' | 'error'
  skillsSel: string[]
  onToggle: (slug: string, checked: boolean) => void
}) {
  const skillCheckbox = (slug: string, name: string, description: string | null, tag?: string) => {
    const checked = skillsSel.includes(slug)
    return (
      <label key={slug} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <CheckBox checked={checked} onChange={(v) => onToggle(slug, v)} label={name} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>
            {name}
            {tag && <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}> · {tag}</span>}
          </span>
          {description && (
            <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>{description}</span>
          )}
        </span>
      </label>
    )
  }

  if (catalogState === 'loading') {
    return <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Carregando catálogo…</p>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {catalogState === 'error' && (
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--reject)' }}>
          Não foi possível carregar o catálogo de skills. As já equipadas aparecem abaixo e podem ser removidas.
        </p>
      )}
      {catalog.map((sk) => skillCheckbox(sk.slug, sk.name, sk.description))}
      {skillsSel
        .filter((s) => !catalog.some((c) => c.slug === s))
        .map((slug) => skillCheckbox(slug, slug, null, catalogState === 'loaded' ? 'indisponível' : undefined))}
      {catalogState === 'loaded' && catalog.length === 0 && skillsSel.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Nenhuma skill na biblioteca ainda.</p>
      )}
    </div>
  )
}
