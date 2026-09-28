'use client'






import { useState } from 'react'
import type { ContratoView, ContratoStatus, Semaforo } from '@/lib/juridico/types'
import { contagemSemaforo } from '@/lib/juridico/parecer'
import { getModeloFabrica } from '@/lib/juridico/modelosFabrica'
import { EstudioCard } from '@/components/copy/EstudioCard'

const STATUS_LABEL: Record<ContratoStatus, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em revisão',
  recebido: 'Recebido',
  analisado: 'Analisado',
  finalizado: 'Finalizado',
  arquivado: 'Arquivado',
}

const SEMAFORO_COR: Record<Semaforo, string> = {
  critico: 'var(--reject)',
  atencao: 'rgb(214 158 46)',
  ok: 'var(--approve)',
}

export function ContratoCard({ contrato, onFocar }: { contrato: ContratoView; onFocar: (id: string) => void }) {
  const [ativo, setAtivo] = useState(false)
  const tipoNome = getModeloFabrica(contrato.tipo)?.nome ?? contrato.tipo
  const finalizado = contrato.status === 'finalizado'
  const sem =
    contrato.kind === 'analisado' && contrato.parecer ? contagemSemaforo(contrato.parecer) : null
  const nPend = contrato.kind === 'gerado' ? contrato.pendencias.length : 0

  return (
    <div
      onMouseEnter={() => setAtivo(true)}
      onMouseLeave={() => setAtivo(false)}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        outline: `1px solid ${ativo ? 'color-mix(in srgb, var(--wave-from) 32%, transparent)' : 'transparent'}`,
        outlineOffset: -1,
        transition: 'outline-color 140ms ease',
      }}
    >
      <EstudioCard
        eyebrow={tipoNome}
        dim={contrato.status === 'arquivado'}
        headerRight={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <StatusBadge status={contrato.status} finalizado={finalizado} />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
              v{contrato.versaoAtual}
            </span>
          </span>
        }
      >
        {}
        <button
          type="button"
          onClick={() => onFocar(contrato.id)}
          onFocus={() => setAtivo(true)}
          onBlur={() => setAtivo(false)}
          aria-label={`Abrir contrato ${contrato.titulo}`}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'var(--radius-lg)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        />

        <h3
          style={{
            margin: '-2px 0 0',
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.35,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {contrato.titulo}
        </h3>

        {(sem || nPend > 0) && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            {sem && <MiniSemaforo contagem={sem} />}
            {nPend > 0 && <PendenciaBadge n={nPend} />}
          </div>
        )}
      </EstudioCard>
    </div>
  )
}


function MiniSemaforo({ contagem }: { contagem: { critico: number; atencao: number; ok: number } }) {
  const itens: { key: Semaforo; n: number }[] = [
    { key: 'critico', n: contagem.critico },
    { key: 'atencao', n: contagem.atencao },
    { key: 'ok', n: contagem.ok },
  ]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      {itens.map(({ key, n }) =>
        n > 0 ? (
          <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span
              aria-hidden
              style={{ width: 7, height: 7, borderRadius: 999, background: SEMAFORO_COR[key], flexShrink: 0 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
          </span>
        ) : null,
      )}
    </span>
  )
}


function PendenciaBadge({ n }: { n: number }) {
  const cor = 'rgb(214 158 46)'
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        color: cor,
        background: `color-mix(in srgb, ${cor} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${cor} 30%, transparent)`,
      }}
    >
      ⚠ {n} pendência{n > 1 ? 's' : ''}
    </span>
  )
}


function StatusBadge({ status, finalizado }: { status: ContratoStatus; finalizado: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        color: finalizado ? 'var(--approve)' : 'var(--text-secondary)',
        background: finalizado ? 'color-mix(in srgb, var(--approve) 14%, transparent)' : 'transparent',
        border: finalizado
          ? '1px solid color-mix(in srgb, var(--approve) 30%, transparent)'
          : '1px solid var(--border-hairline)',
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
