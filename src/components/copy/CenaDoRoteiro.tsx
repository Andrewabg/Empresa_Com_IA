'use client'









import { useState } from 'react'
import type { Bloco } from '@/lib/estudio/blocos'
import { faixaDaCena } from '@/lib/estudio/roteiro'
import type { EdicaoDaCopy } from './PecaCard'


function LinhaDeDirecao({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  if (!valor) return null
  return (
    <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
      <span style={{ fontWeight: 600, letterSpacing: '0.02em' }}>{rotulo}: </span>
      <span style={destaque ? { color: 'var(--text-secondary)', fontWeight: 600 } : undefined}>{valor}</span>
    </p>
  )
}

export function CenaDoRoteiro({
  bloco, variacao, edicao,
}: {
  bloco: Bloco
  variacao: number
  edicao?: EdicaoDaCopy
}) {
  const cena = bloco.cena!
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(cena.fala)
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(bloco.texto)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 1400)
    } catch {  }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(64px, auto) 1fr',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface-elevated)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {faixaDaCena(cena)}
        </span>
        <span style={{ fontSize: 10, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          {bloco.rotulo}
        </span>
      </div>

      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {editando && edicao ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <textarea
              value={rascunho}
              rows={3}
              autoFocus
              disabled={edicao.ocupado}
              onChange={(e) => setRascunho(e.target.value)}
              aria-label={`Fala de ${bloco.rotulo}`}
              style={{
                width: '100%', resize: 'vertical', padding: '6px 8px',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)',
                background: 'var(--surface-sunken, transparent)', color: 'var(--text-primary)',
                fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                disabled={edicao.ocupado || rascunho.trim() === cena.fala}
                onClick={() => { edicao.onEditarBloco(variacao, bloco.id, rascunho); setEditando(false) }}
                style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)', color: 'var(--text-secondary)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
              >
                {edicao.ocupado ? 'Salvando…' : 'Salvar'}
              </button>
              <button
                type="button"
                disabled={edicao.ocupado}
                onClick={() => { setRascunho(cena.fala); setEditando(false) }}
                style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', fontSize: 11.5, cursor: 'pointer', padding: 0 }}
              >
                Cancelar
              </button>
              <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                O tempo se refaz sozinho.
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <p style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 13, lineHeight: 1.5, color: cena.fala ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              {cena.fala || 'Cena sem fala.'}
            </p>
            <button
              type="button"
              onClick={() => void copiar()}
              aria-label={`Copiar ${bloco.rotulo}`}
              style={{ flexShrink: 0, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 10.5, color: copiado ? 'var(--wave-from)' : 'var(--text-tertiary)', padding: 0 }}
            >
              {copiado ? 'copiado' : 'copiar'}
            </button>
            {edicao && (
              <button
                type="button"
                onClick={() => { setRascunho(cena.fala); setEditando(true) }}
                aria-label={`Editar a fala de ${bloco.rotulo}`}
                title="Editar a fala. Não gera texto novo, então não custa nada."
                style={{ flexShrink: 0, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 10.5, color: 'var(--text-tertiary)', padding: 0 }}
              >
                editar
              </button>
            )}
          </div>
        )}

        <LinhaDeDirecao rotulo="Ação" valor={cena.acao} />
        <LinhaDeDirecao rotulo="Na tela" valor={cena.textoNaTela} destaque />
        <LinhaDeDirecao rotulo="B-roll" valor={cena.bRoll} />
      </div>
    </div>
  )
}
