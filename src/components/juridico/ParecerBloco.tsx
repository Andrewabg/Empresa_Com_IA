





import type { Parecer, Recomendacao, Semaforo } from '@/lib/juridico/types'
import { resumoParecer } from '@/lib/juridico/parecer'
import { Markdown } from '@/components/markdown/Markdown'


const SEMAFORO_COR: Record<Semaforo, string> = {
  critico: 'var(--reject)',
  atencao: 'rgb(214 158 46)',
  ok: 'var(--approve)',
}

const RECOMENDACAO_INFO: Record<Recomendacao, { label: string; cor: string }> = {
  assinar: { label: 'Pode assinar', cor: 'var(--approve)' },
  negociar: { label: 'Negocie antes', cor: 'rgb(214 158 46)' },
  nao_assinar: { label: 'Não assine assim', cor: 'var(--reject)' },
}

export function ParecerBloco({ parecer }: { parecer: Parecer }) {
  const rec = RECOMENDACAO_INFO[parecer.recomendacao]
  const contagem = resumoParecer(parecer)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          {rec && <RecomendacaoBadge label={rec.label} cor={rec.cor} />}
          {contagem && (
            <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
              {contagem}
            </span>
          )}
        </div>
        {parecer.resumoExecutivo && (
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.55,
              color: 'var(--text-primary)',
              fontWeight: 500,
            }}
          >
            {parecer.resumoExecutivo}
          </p>
        )}
      </div>

      {}
      {parecer.clausulas.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {parecer.clausulas.map((cl, i) => {
            const cor = SEMAFORO_COR[cl.semaforo] ?? 'var(--text-tertiary)'
            return (
              <li
                key={`${cl.ref}-${i}`}
                style={{
                  borderLeft: `3px solid ${cor}`,
                  paddingLeft: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {cl.ref} — {cl.titulo}
                </span>
                {cl.analise && (
                  <div style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                    <Markdown chat>{cl.analise}</Markdown>
                  </div>
                )}
                {cl.redline && (
                  <div
                    style={{
                      marginTop: 2,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border-hairline)',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        color: 'var(--text-tertiary)',
                        marginBottom: 3,
                      }}
                    >
                      ✏️ Sugestão de redline
                    </span>
                    <div
                      style={{
                        margin: 0,
                        fontSize: 12.5,
                        lineHeight: 1.55,
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic',
                      }}
                    >
                      <Markdown chat>{cl.redline}</Markdown>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}


function RecomendacaoBadge({ label, cor }: { label: string; cor: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 9px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        color: cor,
        background: `color-mix(in srgb, ${cor} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${cor} 30%, transparent)`,
      }}
    >
      {label}
    </span>
  )
}
