'use client'








import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { fmtUsd } from '@/lib/chart'
import { FORMATOS } from '@/lib/estudio/formatos'
import { estimarEntrega, TETO_DE_PECAS_POR_ENTREGA, totalDePecas } from '@/lib/entrega/estimativa'
import { pedidoEstaCompleto, resumoDoPedido } from '@/lib/entrega/pedido'
import { COPY_WIZARD, avisoDoTeto, notaDeFinalizar } from '@/lib/entrega/copy'
import type { PedidoDeEntrega } from '@/lib/entrega/types'

const PEDIDO_VAZIO: PedidoDeEntrega = { objetivo: '', oferta: '', publico: '', quantidades: {}, comArte: true }

export function PedidoWizard({
  onConfirmar,
  onCancelar,
  enviando,
  erro,
  designerInstalado,
}: {
  onConfirmar: (pedido: PedidoDeEntrega) => void
  onCancelar: () => void
  enviando: boolean
  erro: string | null
  designerInstalado: boolean
}) {
  const [passo, setPasso] = useState<1 | 2 | 3>(1)
  const [pedido, setPedido] = useState<PedidoDeEntrega>({ ...PEDIDO_VAZIO, comArte: designerInstalado })

  const total = totalDePecas(pedido.quantidades)
  const estimativa = useMemo(() => estimarEntrega(pedido), [pedido])
  const passouDoTeto = Math.max(0, total - TETO_DE_PECAS_POR_ENTREGA)

  const setQuantidade = (slug: string, n: number) =>
    setPedido((p) => {
      const q = { ...p.quantidades }
      if (n <= 0) delete q[slug]
      else q[slug] = n
      return { ...p, quantidades: q }
    })

  const podeAvancar = passo === 1 ? !!pedido.objetivo.trim() : passo === 2 ? total > 0 : pedidoEstaCompleto(pedido)

  return (
    <section
      aria-label="Pedir uma entrega"
      style={{
        display: 'flex', flexDirection: 'column', gap: 18,
        padding: 'clamp(18px, 2.4vw, 26px)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface)',
      }}
    >
      <Passos atual={passo} />

      {passo === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Cabecalho titulo={COPY_WIZARD.passo1Titulo} sub={COPY_WIZARD.passo1Sub} />
          <Campo
            label={COPY_WIZARD.labelObjetivo}
            dica={COPY_WIZARD.dicaObjetivo}
            valor={pedido.objetivo}
            linhas={3}
            onChange={(objetivo) => setPedido((p) => ({ ...p, objetivo }))}
          />
          <Campo
            label={COPY_WIZARD.labelOferta}
            dica={COPY_WIZARD.dicaOferta}
            valor={pedido.oferta}
            linhas={2}
            onChange={(oferta) => setPedido((p) => ({ ...p, oferta }))}
          />
          <Campo
            label={COPY_WIZARD.labelPublico}
            dica={COPY_WIZARD.dicaPublico}
            valor={pedido.publico}
            linhas={2}
            onChange={(publico) => setPedido((p) => ({ ...p, publico }))}
          />
        </div>
      )}

      {passo === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Cabecalho titulo={COPY_WIZARD.passo2Titulo} sub={COPY_WIZARD.passo2Sub} />
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {FORMATOS.map((f) => (
              <li key={f.slug} style={{ listStyle: 'none' }}>
                <LinhaDeFormato
                  nome={f.nome}
                  descricao={f.descricao}
                  valor={pedido.quantidades[f.slug] ?? 0}
                  onChange={(n) => setQuantidade(f.slug, n)}
                />
              </li>
            ))}
          </ul>

          {designerInstalado && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={pedido.comArte}
                onChange={(e) => setPedido((p) => ({ ...p, comArte: e.target.checked }))}
                style={{ marginTop: 3, accentColor: 'var(--wave-to)' }}
              />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{COPY_WIZARD.labelComArte}</span>
                <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>{COPY_WIZARD.dicaComArte}</span>
              </span>
            </label>
          )}

          {passouDoTeto > 0 && <Aviso texto={avisoDoTeto(passouDoTeto, TETO_DE_PECAS_POR_ENTREGA)} />}
          {total === 0 && <Aviso texto={COPY_WIZARD.nenhumFormato} />}
        </div>
      )}

      {passo === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Cabecalho titulo={COPY_WIZARD.passo3Titulo} sub={COPY_WIZARD.passo3Sub} />

          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-primary)' }}>
            {resumoDoPedido(pedido)}
          </p>

          <div
            style={{
              display: 'flex', flexDirection: 'column', gap: 8,
              padding: 14, borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              {COPY_WIZARD.tituloEstimativa}
            </span>
            {estimativa.linhas.map((l) => (
              <div key={l.rotulo} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                <span>{l.rotulo}{l.quantidade > 1 ? ` (${l.quantidade})` : ''}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>US$ {fmtUsd(l.usd)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingTop: 8, borderTop: '1px solid var(--border-hairline)', fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
              <span>Total estimado</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>US$ {fmtUsd(estimativa.usd)}</span>
            </div>
            {pedido.comArte && (
              <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
                {notaDeFinalizar(estimativa.finalizarCadaUma)}
              </span>
            )}
            <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
              {COPY_WIZARD.rodapeEstimativa}
            </span>
          </div>

          {erro && <Aviso texto={erro} />}
        </div>
      )}

      <footer style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button variant="ghost" onClick={passo === 1 ? onCancelar : () => setPasso((p) => (p === 3 ? 2 : 1))} disabled={enviando}>
          {passo === 1 ? COPY_WIZARD.cancelar : COPY_WIZARD.voltar}
        </Button>
        <span style={{ flex: 1 }} />
        {passo < 3 ? (
          <Button variant="primary" onClick={() => setPasso((p) => (p === 1 ? 2 : 3))} disabled={!podeAvancar}>
            {COPY_WIZARD.avancar}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => onConfirmar(pedido)} disabled={!podeAvancar || enviando}>
            {enviando ? COPY_WIZARD.confirmando : COPY_WIZARD.confirmar}
          </Button>
        )}
      </footer>
    </section>
  )
}

function Passos({ atual }: { atual: 1 | 2 | 3 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} aria-hidden>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          style={{
            height: 3, flex: 1, borderRadius: 999,
            background: n <= atual ? 'linear-gradient(120deg, var(--wave-from), var(--wave-to))' : 'var(--surface-elevated)',
          }}
        />
      ))}
    </div>
  )
}

function Cabecalho({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
        {titulo}
      </h2>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{sub}</p>
    </div>
  )
}

function Campo({
  label, dica, valor, linhas, onChange,
}: { label: string; dica: string; valor: string; linhas: number; onChange: (v: string) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
      <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>{dica}</span>
      <textarea
        value={valor}
        rows={linhas}
        onChange={(e) => onChange(e.target.value)}
        style={{
          marginTop: 3, padding: '9px 11px', resize: 'vertical',
          borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)',
          background: 'var(--surface-elevated)', color: 'var(--text-primary)',
          fontFamily: 'var(--font-ui)', fontSize: 13, lineHeight: 1.5,
        }}
      />
    </label>
  )
}

function LinhaDeFormato({
  nome, descricao, valor, onChange,
}: { nome: string; descricao: string; valor: number; onChange: (n: number) => void }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${valor > 0 ? 'color-mix(in srgb, var(--wave-to) 40%, var(--border-hairline))' : 'var(--border-hairline)'}`,
        background: 'var(--surface-elevated)',
      }}
    >
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{nome}</span>
        <span
          title={descricao}
          style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {descricao}
        </span>
      </span>
      <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Button size="sm" onClick={() => onChange(valor - 1)} disabled={valor <= 0} aria-label={`Menos um ${nome}`}>−</Button>
        <span style={{ minWidth: 16, textAlign: 'center', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: valor > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
          {valor}
        </span>
        <Button size="sm" onClick={() => onChange(valor + 1)} aria-label={`Mais um ${nome}`}>+</Button>
      </span>
    </div>
  )
}

function Aviso({ texto }: { texto: string }) {
  return (
    <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>{texto}</p>
  )
}
