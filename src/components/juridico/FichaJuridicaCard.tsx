'use client'






import type { ReactNode } from 'react'
import type { FichaJuridica, FichaLearning } from '@/lib/juridico/ficha'
import { WaveMark } from '@/components/copy/EstudioCard'

const ORIGEM_LABEL: Record<FichaLearning['origem'], string> = {
  entrevista: 'entrevista',
  revisao: 'revisão',
  reflector: 'reflector',
  operador: 'você',
}


function fichaVazia(f: FichaJuridica | null): boolean {
  if (!f) return true
  return (
    !f.razaoSocial &&
    !f.cnpj &&
    !f.endereco &&
    !f.representante &&
    !f.foro &&
    !(f.posturas?.length) &&
    !f.observacoes &&
    !(f.aprendizados?.length)
  )
}


function formatarData(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}


function ultimoReflector(f: FichaJuridica): string | null {
  const ats = (f.aprendizados ?? []).filter((a) => a.origem === 'reflector').map((a) => a.at)
  if (!ats.length) return null
  return ats.reduce((a, b) => (a > b ? a : b))
}

export function FichaJuridicaCard({
  ficha,
  onRemoverAprendizado,
}: {
  ficha: FichaJuridica | null
  onRemoverAprendizado: (texto: string) => void
}) {
  const vazia = fichaVazia(ficha)

  return (
    <section
      aria-label="Ficha Jurídica"
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
          Ficha Jurídica
        </span>
      </header>

      {vazia ? (
        <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--text-tertiary)' }}>
          O Alan ainda está conhecendo a empresa — converse com ele.
        </p>
      ) : (
        <FichaConteudo ficha={ficha!} onRemoverAprendizado={onRemoverAprendizado} />
      )}
    </section>
  )
}

function FichaConteudo({
  ficha,
  onRemoverAprendizado,
}: {
  ficha: FichaJuridica
  onRemoverAprendizado: (texto: string) => void
}) {
  const aprendizados = ficha.aprendizados ?? []
  const carimbo = ultimoReflector(ficha)
  const temIdentidade = !!(ficha.razaoSocial || ficha.cnpj || ficha.endereco || ficha.representante)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
      {}
      {temIdentidade && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SecaoTitulo>Identidade</SecaoTitulo>
          <Campo label="Razão social" valor={ficha.razaoSocial} />
          <Campo label="CNPJ" valor={ficha.cnpj} />
          <Campo label="Endereço" valor={ficha.endereco} />
          <Campo label="Representante legal" valor={ficha.representante} />
        </div>
      )}

      {}
      {ficha.foro && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SecaoTitulo>Foro</SecaoTitulo>
          <Campo label="Foro de eleição" valor={ficha.foro} />
        </div>
      )}

      {}
      {(ficha.posturas?.length ?? 0) > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SecaoTitulo>Posturas da casa</SecaoTitulo>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ficha.posturas!.map((p, i) => (
              <li
                key={`${p}-${i}`}
                style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}
              >
                <span aria-hidden style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 1 }}>•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {}
      {ficha.observacoes && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SecaoTitulo>Observações</SecaoTitulo>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
            {ficha.observacoes}
          </p>
        </div>
      )}

      {}
      {aprendizados.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SecaoTitulo>Aprendizados</SecaoTitulo>
          {carimbo && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Refletor atualizou em {formatarData(carimbo)}
            </span>
          )}
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {aprendizados.map((l, i) => (
              <AprendizadoItem key={`${l.texto}-${i}`} l={l} onRemover={() => onRemoverAprendizado(l.texto)} />
            ))}
          </ul>
        </div>
      )}
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


function AprendizadoItem({ l, onRemover }: { l: FichaLearning; onRemover: () => void }) {
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
        <span>{l.texto}</span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{ORIGEM_LABEL[l.origem]}</span>
      </div>
      <RemoverBtn onClick={onRemover} />
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
