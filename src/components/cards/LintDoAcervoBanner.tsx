
export function LintDoAcervoBanner({ titulo, corpo }: { titulo: string; corpo: string }) {
  return (
    <div
      role="alert"
      style={{
        margin: '0 0 16px',
        padding: '11px 16px',
        fontSize: 13,
        lineHeight: 1.55,
        color: 'var(--text-secondary)',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderLeft: '2px solid var(--reject)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{titulo}</strong>
      <span style={{ display: 'block', marginTop: 4 }}>{corpo}</span>
    </div>
  )
}
