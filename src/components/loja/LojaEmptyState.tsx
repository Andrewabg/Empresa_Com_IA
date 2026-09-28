
import Link from 'next/link'
import { TONE_COLOR, type BannerAcao, type LicenseTone } from '@/lib/license-copy'

export function LojaEmptyState({
  text,
  tone,
  acao,
}: {
  text: string
  tone: LicenseTone
  acao?: BannerAcao
}) {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        maxWidth: 560,
        margin: '64px auto 0',
        padding: '18px 22px',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-md)',
        fontSize: 14,
        lineHeight: 1.5,
        color: TONE_COLOR[tone],
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <span
          aria-hidden
          style={{ width: 7, height: 7, borderRadius: 99, background: TONE_COLOR[tone], flexShrink: 0 }}
        />
        {text}
      </div>

      {acao && (
        <Link
          href={acao.href}
          style={{
            padding: '8px 20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgb(40 224 200 / 0.18)',
            background: 'rgb(40 224 200 / 0.07)',
            color: 'var(--wave-from)',
            fontSize: 13.5,
            fontWeight: 500,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {acao.rotulo}
        </Link>
      )}
    </div>
  )
}
