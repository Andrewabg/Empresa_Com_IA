'use client'







import { useMemo, useState } from 'react'
import type { ContratoView, ContratoStatus } from '@/lib/juridico/types'
import type { PropostaPrazo } from '@/lib/juridico/prazosTipos'
import { getModeloFabrica } from '@/lib/juridico/modelosFabrica'
import { quebrarSubclausulas, extrairPendencias } from '@/lib/juridico/minuta'
import { PrazosPropostaForm } from './PrazosPropostaForm'


function pendInputId(descr: string): string {
  return 'pend-' + descr.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '')
}

const AMBAR = 'rgb(214 158 46)'
import { EstudioCard } from '@/components/copy/EstudioCard'
import { ParecerBloco } from './ParecerBloco'

const STATUS_LABEL: Record<ContratoStatus, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em revisão',
  recebido: 'Recebido',
  analisado: 'Analisado',
  finalizado: 'Finalizado',
  arquivado: 'Arquivado',
}


const PARTE_RE = /^\*\*(.+?)\*\*:\s*(.*)$/

interface ContratoStageProps {
  contrato: ContratoView
  onAnalisar: (id: string) => void
  onFinalizar: (id: string) => void
  onSalvarModelo: (id: string) => void
  onArquivar: (id: string) => void
  
  onPreencher: (id: string, valores: Record<string, string>) => void | Promise<void>
  
  proposta?: { contratoId: string; prazos: PropostaPrazo[] } | null
  
  onConfirmarPrazos: (contratoId: string, prazos: PropostaPrazo[]) => void
}

type AcoesProps = Pick<ContratoStageProps, 'contrato' | 'onAnalisar' | 'onFinalizar' | 'onSalvarModelo' | 'onArquivar'>

export function ContratoStage({
  contrato,
  onAnalisar,
  onFinalizar,
  onSalvarModelo,
  onArquivar,
  onPreencher,
  proposta,
  onConfirmarPrazos,
}: ContratoStageProps) {
  const tipoNome = getModeloFabrica(contrato.tipo)?.nome ?? contrato.tipo
  const finalizado = contrato.status === 'finalizado'
  const analisadoSemParecer = contrato.kind === 'analisado' && !contrato.parecer

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        <h2
          style={{
            margin: '-2px 0 12px',
            fontFamily: 'var(--font-display)',
            fontSize: 17,
            fontWeight: 600,
            lineHeight: 1.3,
            color: 'var(--text-primary)',
          }}
        >
          {contrato.titulo}
        </h2>

        {}
        <Acoes
          contrato={contrato}
          onAnalisar={onAnalisar}
          onFinalizar={onFinalizar}
          onSalvarModelo={onSalvarModelo}
          onArquivar={onArquivar}
        />

        {}
        {contrato.kind === 'gerado' && <PendenciasForm contrato={contrato} onPreencher={onPreencher} />}

        {}
        {proposta?.contratoId === contrato.id && (
          <PrazosPropostaForm
            contratoId={proposta.contratoId}
            prazos={proposta.prazos}
            onConfirmar={onConfirmarPrazos}
          />
        )}

        {}
        {contrato.parecer ? (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ParecerBloco parecer={contrato.parecer} />
            {contrato.kind === 'analisado' ? (
              <details>
                <summary
                  style={{
                    cursor: 'pointer',
                    fontSize: 12,
                    color: 'var(--text-tertiary)',
                    listStyle: 'revert',
                  }}
                >
                  Texto original completo
                </summary>
                <div style={{ marginTop: 10 }}>
                  <TextoContrato texto={contrato.texto} />
                </div>
              </details>
            ) : (
              <TextoContrato texto={contrato.texto} />
            )}
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <TextoContrato texto={contrato.texto} />
          </div>
        )}

        {analisadoSemParecer && (
          <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
            Este contrato foi recebido para análise. Peça o parecer pra o Alan destrinchar as cláusulas com
            semáforo.
          </p>
        )}
      </EstudioCard>

      {}
      <footer
        style={{
          padding: '0 2px',
          fontSize: 11.5,
          lineHeight: 1.5,
          color: 'var(--text-tertiary)',
          textAlign: 'center',
        }}
      >
        Orientação preventiva — não substitui a revisão de um advogado.
      </footer>
    </div>
  )
}


function PendenciasForm({
  contrato,
  onPreencher,
}: {
  contrato: ContratoView
  onPreencher: (id: string, valores: Record<string, string>) => void | Promise<void>
}) {
  const lacunas = useMemo(() => extrairPendencias(contrato.texto), [contrato.texto])
  const [valores, setValores] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  if (!lacunas.length) return null

  const preenchidos = lacunas.filter((l) => (valores[l] ?? '').trim()).length
  const set = (l: string, v: string) => setValores((prev) => ({ ...prev, [l]: v }))
  const submit = async () => {
    if (!preenchidos || enviando) return
    setEnviando(true)
    try {
      await onPreencher(contrato.id, valores)
      setValores({})
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      style={{
        marginTop: 14,
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid color-mix(in srgb, ${AMBAR} 30%, transparent)`,
        background: `color-mix(in srgb, ${AMBAR} 8%, transparent)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: AMBAR }}>O Alan precisa de você</span>
        <button
          type="button"
          onClick={submit}
          disabled={!preenchidos || enviando}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            cursor: preenchidos && !enviando ? 'pointer' : 'default',
            color: preenchidos && !enviando ? 'var(--bg-base)' : 'var(--text-tertiary)',
            background: preenchidos && !enviando ? AMBAR : 'var(--surface-elevated)',
            border: `1px solid ${preenchidos && !enviando ? AMBAR : 'var(--border-hairline)'}`,
            transition: 'background 120ms ease, color 120ms ease',
          }}
        >
          {enviando ? 'Preenchendo…' : preenchidos ? `Preencher (${preenchidos})` : 'Preencher'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lacunas.map((l) => (
          <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label htmlFor={pendInputId(l)} style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
              {l}
            </label>
            <input
              id={pendInputId(l)}
              value={valores[l] ?? ''}
              onChange={(e) => set(l, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void submit()
                }
              }}
              placeholder={`Preencher ${l}…`}
              autoComplete="off"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>
        ))}
      </div>

      <p style={{ margin: '10px 0 0', fontSize: 11, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
        Preenche direto no contrato (cria uma nova versão) — sem precisar ditar pro Alan.
      </p>
    </div>
  )
}


function Acoes({
  contrato,
  onAnalisar,
  onFinalizar,
  onSalvarModelo,
  onArquivar,
}: AcoesProps) {
  if (contrato.kind === 'gerado') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <AcaoBtn onClick={() => onAnalisar(contrato.id)}>Pedir parecer interno</AcaoBtn>
        <AcaoBtn onClick={() => onFinalizar(contrato.id)} accent="approve">Finalizar</AcaoBtn>
        <AcaoBtn onClick={() => onSalvarModelo(contrato.id)}>Salvar como modelo</AcaoBtn>
        <AcaoBtn onClick={() => onArquivar(contrato.id)}>Arquivar</AcaoBtn>
      </div>
    )
  }

  if (contrato.kind === 'analisado') {
    const semParecer = !contrato.parecer
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {semParecer && (
          <AcaoProeminente onClick={() => onAnalisar(contrato.id)}>Pedir parecer</AcaoProeminente>
        )}
        <AcaoBtn onClick={() => onArquivar(contrato.id)}>Arquivar</AcaoBtn>
      </div>
    )
  }

  
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <AcaoBtn onClick={() => onArquivar(contrato.id)}>Arquivar</AcaoBtn>
    </div>
  )
}


function expandirLinhas(texto: string): string[] {
  const out: string[] = []
  let clausula = ''
  for (const linha of texto.split('\n')) {
    const h = linha.match(/^##\s+Cláusula\s+(\S+)/)
    if (h) { clausula = h[1]; out.push(linha); continue }
    if (linha.startsWith('#') || PARTE_RE.test(linha) || linha.trim() === '') {
      out.push(linha)
      continue
    }
    if (!clausula) { out.push(linha); continue }
    const subs = quebrarSubclausulas(linha, clausula).split('\n')
    subs.forEach((s, idx) => {
      if (idx > 0) out.push('') 
      out.push(s)
    })
  }
  return out
}


function TextoContrato({ texto }: { texto: string }) {
  const linhas = expandirLinhas(texto)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {linhas.map((linha, i) => (
        <LinhaContrato key={i} linha={linha} />
      ))}
    </div>
  )
}


function LinhaContrato({ linha }: { linha: string }) {
  if (linha.startsWith('## ')) {
    return (
      <h4
        style={{
          margin: '10px 0 2px',
          fontSize: 12.5,
          fontWeight: 600,
          letterSpacing: '0.02em',
          color: 'var(--text-primary)',
        }}
      >
        {linha.slice(3)}
      </h4>
    )
  }
  if (linha.startsWith('# ')) {
    return (
      <h3
        style={{
          margin: '12px 0 4px',
          fontFamily: 'var(--font-display)',
          fontSize: 14.5,
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        {linha.slice(2)}
      </h3>
    )
  }
  const parte = linha.match(PARTE_RE)
  if (parte) {
    return (
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{parte[1]}:</span>{' '}
        <span style={{ color: 'var(--text-secondary)' }}>{renderComMarcadores(parte[2])}</span>
      </p>
    )
  }
  if (linha.trim() === '') return <div style={{ height: 8 }} />
  return <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{renderComMarcadores(linha)}</p>
}


function renderComMarcadores(text: string): React.ReactNode {
  if (!text.includes('[PENDENTE:')) return text
  const nodes: React.ReactNode[] = []
  const re = /\[PENDENTE:([^\]]+)\]/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    nodes.push(<PendChip key={`p${i++}`} descr={m[1].trim()} />)
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}


function PendChip({ descr }: { descr: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const el = document.getElementById(pendInputId(descr)) as HTMLInputElement | null
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        el?.focus()
      }}
      title="Clique para preencher no formulário acima"
      style={{
        display: 'inline',
        padding: '0 5px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid color-mix(in srgb, ${AMBAR} 40%, transparent)`,
        background: `color-mix(in srgb, ${AMBAR} 16%, transparent)`,
        color: AMBAR,
        font: 'inherit',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'normal',
      }}
    >
      {descr}
    </button>
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


function AcaoBtn({
  children,
  onClick,
  accent,
}: {
  children: React.ReactNode
  onClick: () => void
  accent?: 'approve'
}) {
  const [hover, setHover] = useState(false)
  const isApprove = accent === 'approve'
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'color 140ms ease, border-color 140ms ease, background 140ms ease',
        color: isApprove && hover ? 'var(--approve)' : hover ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: isApprove && hover ? 'color-mix(in srgb, var(--approve) 12%, transparent)' : 'transparent',
        border: `1px solid ${
          isApprove && hover ? 'color-mix(in srgb, var(--approve) 40%, transparent)' : 'var(--border-hairline)'
        }`,
      }}
    >
      {children}
    </button>
  )
}


function AcaoProeminente({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        color: 'var(--text-primary)',
        border: '1px solid transparent',
        background:
          'linear-gradient(var(--surface-elevated), var(--surface-elevated)) padding-box, linear-gradient(120deg, var(--wave-from), var(--wave-to)) border-box',
      }}
    >
      {children}
    </button>
  )
}
