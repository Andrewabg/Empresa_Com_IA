'use client'


import { useMemo, useState } from 'react'
import type { CriativoView, DocumentoDeArte } from '@/lib/design/types'
import { templatesDoFormato, BLOCOS_DE_ARTE, type BlocoDeArte } from '@/lib/design/templates'
import { LIMITES_DE_BLOCO, type PatchDeArte } from '@/lib/design/aplicarPatchDeArte'

export interface EdicaoDaArte {
  
  onRecompor: (variacao: number, patch: PatchDeArte, slide?: number) => void
  
  onRestaurar: (n: number) => void
  
  onRemixar: (variacao: number, pedido: string) => void
  ocupado: boolean
}

const ROTULO: Record<BlocoDeArte, string> = {
  headline: 'Título',
  subheadline: 'Apoio',
  cta: 'Botão',
  selo: 'Selo',
}

const LONGOS: BlocoDeArte[] = ['subheadline']

const CORES_EDITAVEIS: { campo: 'fundo' | 'botao' | 'destaque'; rotulo: string; ajuda: string }[] = [
  { campo: 'fundo', rotulo: 'Faixa', ajuda: 'A cor da faixa ou do degradê atrás do texto' },
  { campo: 'botao', rotulo: 'Botão', ajuda: 'O preenchimento do botão de ação' },
  { campo: 'destaque', rotulo: 'Destaque', ajuda: 'A cor de ênfase, usada em selo e detalhe' },
]

const campo: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-hairline)',
  background: 'var(--surface-elevated)',
  color: 'var(--text-primary)',
  fontSize: 12.5,
  fontFamily: 'inherit',
}
const rotulo: React.CSSProperties = { fontSize: 10.5, color: 'var(--text-tertiary)' }

function Botao({
  children, onClick, disabled, primario,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean; primario?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-hairline)',
        background: primario ? 'var(--surface-elevated)' : 'transparent',
        color: disabled ? 'var(--text-tertiary)' : 'var(--text-secondary)',
        fontSize: 12,
        fontWeight: primario ? 600 : 500,
        cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

export function EditorDeArte({
  criativo, variacao, documento, edicao, slide, rotuloDoBotao,
}: {
  criativo: CriativoView
  
  variacao: number
  documento: DocumentoDeArte
  edicao: EdicaoDaArte
  
  slide?: number
  
  rotuloDoBotao?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [blocos, setBlocos] = useState<Partial<Record<BlocoDeArte, string>>>(() => ({ ...documento.blocos }))
  const [template, setTemplate] = useState(documento.template)
  const [cores, setCores] = useState(() => ({ ...documento.cores }))

  const opcoes = useMemo(() => templatesDoFormato(criativo.formato), [criativo.formato])

  const mudou =
    template !== documento.template ||
    CORES_EDITAVEIS.some((c) => (cores[c.campo] ?? '') !== (documento.cores[c.campo] ?? '')) ||
    BLOCOS_DE_ARTE.some((k) => (blocos[k] ?? '').trim() !== (documento.blocos[k] ?? ''))

  const salvar = () => {
    const patch: PatchDeArte = { template, cores: {}, blocos: {} }
    for (const k of BLOCOS_DE_ARTE) {
      const novo = (blocos[k] ?? '').trim()
      if (novo !== (documento.blocos[k] ?? '')) patch.blocos![k] = novo
    }
    for (const c of CORES_EDITAVEIS) {
      if ((cores[c.campo] ?? '') !== (documento.cores[c.campo] ?? '')) patch.cores![c.campo] = cores[c.campo]!
    }
    edicao.onRecompor(variacao, patch, slide)
  }

  if (!aberto) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Botao onClick={() => setAberto(true)}>{rotuloDoBotao ?? 'Editar texto e cores'}</Botao>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          Não gera imagem nova, então não custa nada.
        </span>
        {slide === undefined && <VoltarVersao criativo={criativo} edicao={edicao} />}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        padding: 12, borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-hairline)', background: 'var(--surface-sunken, transparent)',
      }}
    >
      {BLOCOS_DE_ARTE.map((k) => {
        const valor = blocos[k] ?? ''
        const limite = LIMITES_DE_BLOCO[k]
        const passou = valor.trim().length > limite
        return (
          <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ ...rotulo, display: 'flex', justifyContent: 'space-between' }}>
              <span>{ROTULO[k]}</span>
              <span style={{ color: passou ? 'var(--danger, #E5484D)' : 'var(--text-tertiary)' }}>
                {valor.trim().length}/{limite}
              </span>
            </span>
            {LONGOS.includes(k) ? (
              <textarea
                value={valor}
                rows={2}
                disabled={edicao.ocupado}
                onChange={(e) => setBlocos((p) => ({ ...p, [k]: e.target.value }))}
                style={{ ...campo, resize: 'vertical' }}
              />
            ) : (
              <input
                type="text"
                value={valor}
                disabled={edicao.ocupado}
                onChange={(e) => setBlocos((p) => ({ ...p, [k]: e.target.value }))}
                style={campo}
              />
            )}
          </label>
        )
      })}

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={rotulo}>Layout</span>
        <select
          value={template}
          disabled={edicao.ocupado}
          onChange={(e) => setTemplate(e.target.value)}
          style={{ ...campo, color: 'var(--text-secondary)' }}
        >
          {opcoes.map((t) => (
            <option key={t.slug} value={t.slug} title={t.descricao}>{t.nome}</option>
          ))}
        </select>
        <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
          {opcoes.find((t) => t.slug === template)?.descricao}
        </span>
      </label>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {CORES_EDITAVEIS.map((c) => (
          <label key={c.campo} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 96 }}>
            <span style={rotulo} title={c.ajuda}>{c.rotulo}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="color"
                value={cores[c.campo] ?? '#000000'}
                disabled={edicao.ocupado}
                onChange={(e) => setCores((p) => ({ ...p, [c.campo]: e.target.value.toUpperCase() }))}
                style={{ width: 28, height: 24, padding: 0, border: '1px solid var(--border-hairline)', borderRadius: 6, background: 'transparent' }}
                aria-label={`Cor de ${c.rotulo.toLowerCase()}`}
              />
              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                {(cores[c.campo] ?? '').toUpperCase()}
              </span>
            </span>
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Botao onClick={salvar} disabled={edicao.ocupado || !mudou} primario>
          {edicao.ocupado ? 'Remontando…' : 'Aplicar'}
        </Botao>
        <Botao
          onClick={() => {
            setBlocos({ ...documento.blocos })
            setTemplate(documento.template)
            setCores({ ...documento.cores })
            setAberto(false)
          }}
          disabled={edicao.ocupado}
        >
          Fechar
        </Botao>
        <VoltarVersao criativo={criativo} edicao={edicao} />
      </div>
    </div>
  )
}


function VoltarVersao({ criativo, edicao }: { criativo: CriativoView; edicao: EdicaoDaArte }) {
  const anteriores = useMemo(
    () => Array.from({ length: Math.max(0, criativo.versaoAtual - 1) }, (_, i) => i + 1).reverse(),
    [criativo.versaoAtual],
  )
  const [n, setN] = useState<number | ''>('')
  if (!anteriores.length) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
      <select
        value={n}
        disabled={edicao.ocupado}
        onChange={(e) => setN(e.target.value ? Number(e.target.value) : '')}
        aria-label="Voltar para uma versão anterior"
        style={{ ...campo, width: 'auto', fontSize: 11.5, color: 'var(--text-secondary)' }}
      >
        <option value="">Versão anterior…</option>
        {anteriores.map((v) => <option key={v} value={v}>Versão {v}</option>)}
      </select>
      <Botao onClick={() => { if (n) edicao.onRestaurar(n) }} disabled={edicao.ocupado || !n}>
        Voltar
      </Botao>
    </span>
  )
}
