'use client'






import type { ReactNode } from 'react'
import { renderBrandVoice, type BrandVoice, type BrandLearning } from '@/lib/estudio/brandVoice'
import { WaveMark } from './EstudioCard'


function Chip({ children, cor }: { children: ReactNode; cor?: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 11.5,
        lineHeight: 1.4,
        color: cor ?? 'var(--text-secondary)',
        background: cor ? `color-mix(in srgb, ${cor} 12%, transparent)` : 'var(--surface-elevated)',
        border: `1px solid ${cor ? `color-mix(in srgb, ${cor} 26%, transparent)` : 'var(--border-hairline)'}`,
      }}
    >
      {children}
    </span>
  )
}


function ChipList({ label, itens, marca, cor }: { label: string; itens: string[]; marca?: string; cor?: string }) {
  if (!itens.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 5 }}>
        {marca && <span aria-hidden style={{ color: cor, fontWeight: 600 }}>{marca}</span>}
        {label}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {itens.map((t, i) => (
          <Chip key={`${t}-${i}`} cor={cor}>{t}</Chip>
        ))}
      </div>
    </div>
  )
}


function Campo({ label, valor }: { label: string; valor?: string }) {
  if (!valor) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-primary)' }}>{valor}</span>
    </div>
  )
}


export function BrandVoiceCard({
  voice,
  onRemoverAprendizado,
}: {
  voice: BrandVoice | null
  onRemoverAprendizado?: (texto: string) => void
}) {
  const vazio = !voice || renderBrandVoice(voice) === ''

  return (
    <section
      aria-label="Ficha da marca"
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface)',
        padding: '16px 18px',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          <WaveMark />
          Ficha da marca
        </span>
      </header>

      {vazio ? (
        <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--text-tertiary)' }}>
          A Lia ainda está conhecendo a marca.
        </p>
      ) : (
        <FichaConteudo voice={voice!} onRemoverAprendizado={onRemoverAprendizado} />
      )}
    </section>
  )
}


function FichaConteudo({
  voice,
  onRemoverAprendizado,
}: {
  voice: BrandVoice
  onRemoverAprendizado?: (texto: string) => void
}) {
  const dna = voice.dna ?? {}
  const voz = voice.voz_mae ?? {}
  const dialetos = Object.entries(voice.dialetos ?? {}).filter(([, d]) => dialetoTemConteudo(d))
  const aprendizados = voice.aprendizados ?? []

  const ofertas = (dna.ofertas ?? []).map((o) => o.nome + (o.promessa ? ` — ${o.promessa}` : '') + (o.preco ? ` (${o.preco})` : ''))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
      {}
      <Campo label="Negócio" valor={dna.negocio} />
      <ChipList label="Ofertas" itens={ofertas} />
      <ChipList label="Dores do público" itens={dna.publico?.dores ?? []} />
      <ChipList label="Desejos do público" itens={dna.publico?.desejos ?? []} />
      <ChipList label="Objeções" itens={dna.publico?.objecoes ?? []} />
      <Campo label="Consciência típica" valor={dna.publico?.consciencia} />
      <ChipList label="Provas reais" itens={dna.provas ?? []} />

      {}
      {((dna.vozDoPublico?.frasesExatas?.length ?? 0) > 0 || (dna.vozDoPublico?.vocabulario?.length ?? 0) > 0 || (dna.diferenciacao?.length ?? 0) > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 2 }}>
          <SecaoTitulo>Voz do público</SecaoTitulo>
          {(dna.vozDoPublico?.frasesExatas?.length ?? 0) > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>Frases exatas (o que eles dizem)</span>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {dna.vozDoPublico!.frasesExatas.map((f, i) => (
                  <li key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{f}"</li>
                ))}
              </ul>
            </div>
          )}
          <ChipList label="Vocabulário do público" itens={dna.vozDoPublico?.vocabulario ?? []} />
          <ChipList label="Diferenciação" itens={dna.diferenciacao ?? []} />
        </div>
      )}

      {}
      {(voz.personalidade || voz.energia || (voz.vocabularioUsar?.length ?? 0) > 0 || (voz.nuncaDizer?.length ?? 0) > 0 || (voz.exemplos?.length ?? 0) > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 2 }}>
          <SecaoTitulo>Voz-mãe</SecaoTitulo>
          <Campo label="Personalidade" valor={voz.personalidade} />
          <Campo label="Energia" valor={voz.energia} />
          <ChipList label="Vocabulário preferido" itens={voz.vocabularioUsar ?? []} />
          <ChipList label="Nunca dizer" itens={voz.nuncaDizer ?? []} marca="✗" cor="var(--reject)" />
          {(voz.exemplos?.length ?? 0) > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>A marca soa assim</span>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {voz.exemplos!.map((ex, i) => (
                  <li key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    “{ex}”
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {}
      {dialetos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 2 }}>
          <SecaoTitulo>Dialetos por canal</SecaoTitulo>
          {dialetos.map(([canal, d]) => {
            const linha = [d.registro, d.ritmo].filter(Boolean).join(' · ')
            return (
              <div key={canal} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{canal}</span>
                {linha && <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{linha}</span>}
                <ChipList label="Notas" itens={d.notas ?? []} />
              </div>
            )
          })}
        </div>
      )}

      {}
      {aprendizados.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 2 }}>
          <SecaoTitulo>Aprendizados</SecaoTitulo>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {aprendizados.map((l, i) => (
              <AprendizadoItem
                key={`${l.texto}-${i}`}
                l={l}
                onRemover={onRemoverAprendizado ? () => onRemoverAprendizado(l.texto) : undefined}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}


function AprendizadoItem({ l, onRemover }: { l: BrandLearning; onRemover?: () => void }) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        fontSize: 13,
        lineHeight: 1.5,
        color: 'var(--text-secondary)',
      }}
    >
      <span aria-hidden style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 1 }}>•</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, flex: 1 }}>
        <span>{l.texto}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <MiniBadge>{escopoLabel(l)}</MiniBadge>
          <MiniBadge tenue>{ORIGEM_LABEL[l.origem]}</MiniBadge>
        </div>
      </div>
      {onRemover && (
        <RemoverBtn onClick={onRemover} />
      )}
    </li>
  )
}


function SecaoTitulo({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--text-tertiary)',
        paddingTop: 2,
        borderTop: '1px solid var(--border-hairline)',
      }}
    >
      {children}
    </span>
  )
}


function MiniBadge({ children, tenue }: { children: ReactNode; tenue?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 7px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 10.5,
        lineHeight: 1.4,
        color: 'var(--text-tertiary)',
        background: tenue ? 'transparent' : 'var(--surface-elevated)',
        border: '1px solid var(--border-hairline)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}


function RemoverBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Remover este aprendizado"
      aria-label="Remover este aprendizado"
      style={{
        flexShrink: 0,
        width: 22,
        height: 22,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-hairline)',
        background: 'transparent',
        color: 'var(--text-tertiary)',
        fontSize: 13,
        lineHeight: 1,
        cursor: 'pointer',
        transition: 'color 140ms ease, border-color 140ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--reject)'
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--reject) 40%, transparent)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--text-tertiary)'
        e.currentTarget.style.borderColor = 'var(--border-hairline)'
      }}
    >
      ×
    </button>
  )
}

const ORIGEM_LABEL: Record<BrandLearning['origem'], string> = {
  entrevista: 'entrevista',
  revisao: 'revisão',
  reflector: 'reflector',
  operador: 'você',
}


function escopoLabel(l: BrandLearning): string {
  if (l.escopo === 'voz_mae') return 'voz-mãe'
  if (l.escopo === 'dialeto') return l.canal ? `dialeto: ${l.canal}` : 'dialeto'
  return 'diretriz'
}


function dialetoTemConteudo(d: { registro?: string; ritmo?: string; notas?: string[]; exemplos?: string[] }): boolean {
  return !!(d.registro || d.ritmo || (d.notas?.length ?? 0) > 0 || (d.exemplos?.length ?? 0) > 0)
}
