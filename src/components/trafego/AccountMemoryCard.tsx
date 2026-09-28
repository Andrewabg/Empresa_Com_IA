'use client'







import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { renderAccountMemory, type AccountMemory } from '@/lib/trafego/accountMemory'
import {
  ARQUETIPOS,
  ARQUETIPO_LABEL,
  type ArquetipoConta,
  type PerfilContaSalvo,
} from '@/lib/trafego/perfilConta'
import { NICHOS_POR_ARQUETIPO, NICHO_LABEL } from '@/lib/trafego/benchmarks'
import { WaveMark } from './BlocoCard'


const AUTO = ''


function nichosDoArquetipo(arquetipo: string): readonly string[] {
  if (!arquetipo) return [] 
  return NICHOS_POR_ARQUETIPO[arquetipo as ArquetipoConta] ?? []
}


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


export function AccountMemoryCard({ mem }: { mem: AccountMemory | null }) {
  const vazio = !mem || renderAccountMemory(mem) === ''

  return (
    <section
      aria-label="Ficha da conta"
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
          Ficha da conta
        </span>
      </header>

      {}
      <PerfilContaEditor salvo={mem?.perfil?.perfilConta} />

      {vazio ? (
        <p style={{ margin: '14px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--text-tertiary)' }}>
          O Rui ainda está aprendendo esta conta.
        </p>
      ) : (
        <FichaConteudo mem={mem!} />
      )}
    </section>
  )
}


function PerfilContaEditor({ salvo }: { salvo?: PerfilContaSalvo }) {
  const router = useRouter()
  const arquetipoSalvo = salvo?.arquetipo ?? AUTO
  const [arquetipo, setArquetipo] = useState<string>(arquetipoSalvo)
  
  
  const [nicho, setNicho] = useState<string>(
    salvo?.nicho && nichosDoArquetipo(arquetipoSalvo).includes(salvo.nicho) ? salvo.nicho : AUTO,
  )
  const [alvo, setAlvo] = useState<string>(salvo?.alvo !== undefined ? String(salvo.alvo) : '')
  const [ticket, setTicket] = useState<string>(salvo?.ticket !== undefined ? String(salvo.ticket) : '')
  const [salvando, setSalvando] = useState(false)
  const [estado, setEstado] = useState<'idle' | 'ok' | 'erro'>('idle')

  const nichosDisponiveis = nichosDoArquetipo(arquetipo)

  
  
  function trocarArquetipo(novo: string) {
    setArquetipo(novo)
    if (!nichosDoArquetipo(novo).includes(nicho)) setNicho(AUTO)
    setEstado('idle')
  }

  async function salvar() {
    if (salvando) return
    setSalvando(true)
    setEstado('idle')
    
    
    const body: PerfilContaSalvo = {}
    if (arquetipo) body.arquetipo = arquetipo as PerfilContaSalvo['arquetipo']
    
    
    if (nicho) body.nicho = nicho
    const alvoNum = Number(alvo)
    if (alvo.trim() && Number.isFinite(alvoNum) && alvoNum > 0) body.alvo = alvoNum
    const ticketNum = Number(ticket)
    if (ticket.trim() && Number.isFinite(ticketNum) && ticketNum > 0) body.ticket = ticketNum
    try {
      const res = await fetch('/api/trafego/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('save falhou')
      setEstado('ok')
      router.refresh() 
    } catch {
      setEstado('erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          htmlFor="perfil-arquetipo"
          style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}
        >
          O que você anuncia?
        </label>
        <select
          id="perfil-arquetipo"
          value={arquetipo}
          onChange={(e) => trocarArquetipo(e.target.value)}
          style={{
            width: '100%',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface-elevated)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            padding: '8px 10px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value={AUTO} style={{ background: 'var(--bg-base)' }}>
            Detectar automaticamente
          </option>
          {ARQUETIPOS.map((a) => (
            <option key={a} value={a} style={{ background: 'var(--bg-base)' }}>
              {ARQUETIPO_LABEL[a]}
            </option>
          ))}
        </select>
      </div>

      {}
      {nichosDisponiveis.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="perfil-nicho" style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
            Seu nicho (opcional)
          </label>
          <select
            id="perfil-nicho"
            value={nicho}
            onChange={(e) => {
              setNicho(e.target.value)
              setEstado('idle')
            }}
            style={{
              width: '100%',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--surface-elevated)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              padding: '8px 10px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value={AUTO} style={{ background: 'var(--bg-base)' }}>
              (usar a média do arquétipo)
            </option>
            {nichosDisponiveis.map((n) => (
              <option key={n} value={n} style={{ background: 'var(--bg-base)' }}>
                {NICHO_LABEL[n] ?? n}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <NumField
          id="perfil-alvo"
          label="CPL/CPA alvo (R$)"
          value={alvo}
          onChange={(v) => {
            setAlvo(v)
            setEstado('idle')
          }}
        />
        <NumField
          id="perfil-ticket"
          label="Ticket médio (R$)"
          value={ticket}
          onChange={(v) => {
            setTicket(v)
            setEstado('idle')
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '7px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface-elevated)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            cursor: salvando ? 'default' : 'pointer',
            opacity: salvando ? 0.55 : 1,
          }}
        >
          {salvando ? 'Salvando…' : 'Salvar tipo de conta'}
        </button>
        {estado === 'ok' && (
          <span style={{ fontSize: 12, color: 'var(--approve)' }}>Salvo</span>
        )}
        {estado === 'erro' && (
          <span style={{ fontSize: 12, color: 'var(--reject)' }}>Não consegui salvar. Tente de novo.</span>
        )}
      </div>
    </div>
  )
}


function NumField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
      <label htmlFor={id} style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="opcional"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface-elevated)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          padding: '8px 10px',
          outline: 'none',
        }}
      />
    </div>
  )
}


function FichaConteudo({ mem }: { mem: AccountMemory }) {
  const p = mem.perfil ?? {}
  const aprendizados = mem.aprendizados ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
      {p.negocio && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>Negócio</span>
          <span style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-primary)' }}>{p.negocio}</span>
        </div>
      )}

      <ChipList label="Públicos que funcionam" itens={p.publicos?.funcionam ?? []} marca="✓" cor="var(--approve)" />
      <ChipList label="Públicos que falharam" itens={p.publicos?.falharam ?? []} marca="✗" cor="var(--reject)" />
      <ChipList label="Criativos que funcionam" itens={p.criativos?.funcionam ?? []} marca="✓" cor="var(--approve)" />
      <ChipList label="Criativos que cansam" itens={p.criativos?.cansam ?? []} marca="✗" cor="var(--reject)" />
      <ChipList label="Padrões temporais" itens={p.temporais ?? []} />
      <ChipList label="Já testado" itens={p.jaTestado ?? []} />

      {aprendizados.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>Aprendizados</span>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {aprendizados.map((l, i) => (
              <li
                key={`${l.texto}-${i}`}
                style={{
                  display: 'flex',
                  gap: 8,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                }}
              >
                <span aria-hidden style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>•</span>
                <span>{l.texto}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
