'use client'







import { useState } from 'react'
import type { PecaView } from '@/lib/estudio/types'
import { CenaDoRoteiro } from './CenaDoRoteiro'
import { GanchosDoRoteiro } from './GanchosDoRoteiro'
import { formatarTimecode } from '@/lib/estudio/roteiro'
import { getFormato } from '@/lib/estudio/formatos'
import { fmtBRL, fmtPct } from '@/lib/trafego/format'
import { Markdown } from '@/components/markdown/Markdown'
import { EstudioCard, EstudioVazio } from './EstudioCard'

const STATUS_LABEL: Record<PecaView['status'], string> = {
  brief: 'Brief',
  rascunho: 'Rascunho',
  revisao: 'Em revisão',
  aprovada: 'Aprovada',
  arquivada: 'Arquivada',
}

interface PecaCardProps {
  peca: PecaView
  
  focada?: boolean
  onAprovar?: (id: string) => void
  onArquivar?: (id: string) => void
  onRevisar?: (id: string) => void
  
  onMarcarNoAr?: (id: string) => void
  
  onAtualizarPerf?: (id: string) => void
  
  onDesvincular?: (id: string) => void
  
  onPedirArte?: (id: string) => void
  
  pedindoArte?: string | null
  
  edicao?: EdicaoDaCopy
}

export function PecaCard({ peca, onAprovar, onArquivar, onRevisar, onMarcarNoAr, onAtualizarPerf, onDesvincular, onPedirArte, pedindoArte, edicao }: PecaCardProps) {
  const [copiado, setCopiado] = useState(false)
  const formatoNome = getFormato(peca.formato)?.nome ?? peca.formato

  
  const escolhidaIdx =
    typeof peca.veredito.escolhida === 'number' &&
    peca.veredito.escolhida >= 0 &&
    peca.variacoes[peca.veredito.escolhida] !== undefined
      ? peca.veredito.escolhida
      : -1

  
  const alvoCopia = peca.variacoes[escolhidaIdx] ?? peca.variacoes[0]

  const temCritica =
    peca.critica.aprovado === false &&
    Array.isArray(peca.critica.problemas) &&
    peca.critica.problemas.length > 0

  async function copiar() {
    const texto = alvoCopia?.texto
    if (!texto) return
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 1500)
    } catch {
      
    }
  }

  return (
    <EstudioCard
      eyebrow={formatoNome}
      headerRight={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {peca.adId && (
            <span
              style={{
                display: 'inline-block',
                padding: '1px 7px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                
                background: 'linear-gradient(120deg, color-mix(in srgb, var(--wave-from) 18%, transparent), color-mix(in srgb, var(--wave-to) 18%, transparent))',
                border: '1px solid color-mix(in srgb, var(--wave-from) 40%, transparent)',
                color: 'var(--wave-from)',
              }}
            >
              ● No ar
            </span>
          )}
          {peca.aprendido && (
            <span
              title="A Lia aprendeu a fórmula desta peça vencedora"
              style={{
                display: 'inline-block',
                padding: '1px 7px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                color: 'var(--wave-from)',
                background: 'color-mix(in srgb, var(--wave-from) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--wave-from) 30%, transparent)',
              }}
            >
              ✓ Aprendi
            </span>
          )}
          <StatusBadge status={peca.status} />
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
            v{peca.versaoAtual}
          </span>
        </span>
      }
      footer={
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {onAprovar && (
            <AcaoBtn onClick={() => onAprovar(peca.id)} accent="approve">
              Aprovar
            </AcaoBtn>
          )}
          <AcaoBtn onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar'}</AcaoBtn>
          {onRevisar && <AcaoBtn onClick={() => onRevisar(peca.id)}>Pedir mudança</AcaoBtn>}
          {}
          {onPedirArte && peca.status !== 'brief' && peca.variacoes.length > 0 && (
            <AcaoBtn onClick={() => onPedirArte(peca.id)} disabled={pedindoArte === peca.id}>
              {pedindoArte === peca.id ? 'Pedindo…' : 'Pedir arte ao Téo'}
            </AcaoBtn>
          )}
          {onArquivar && <AcaoBtn onClick={() => onArquivar(peca.id)}>Arquivar</AcaoBtn>}
          {}
          {!peca.adId && onMarcarNoAr && (
            <AcaoBtn onClick={() => onMarcarNoAr(peca.id)}>Marcar no ar</AcaoBtn>
          )}
          {peca.adId && onAtualizarPerf && (
            <AcaoBtn onClick={() => onAtualizarPerf(peca.id)}>Atualizar</AcaoBtn>
          )}
          {peca.adId && onDesvincular && (
            <AcaoBtn onClick={() => onDesvincular(peca.id)}>Desvincular</AcaoBtn>
          )}
        </div>
      }
    >
      {}
      {peca.titulo && (
        <h2
          style={{
            margin: '-2px 0 12px',
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 600,
            lineHeight: 1.3,
            color: 'var(--text-primary)',
          }}
        >
          {peca.titulo}
        </h2>
      )}

      {peca.variacoes.length === 0 ? (
        <EstudioVazio>A Lia ainda está escrevendo esta peça.</EstudioVazio>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 12,
          }}
        >
          {peca.variacoes.map((v, i) => {
            const escolhida = i === escolhidaIdx
            return (
              <div
                key={`${i}-${v.angulo}`}
                style={
                  escolhida
                    ? {
                        
                        
                        border: '1px solid transparent',
                        borderRadius: 'var(--radius-md)',
                        background:
                          'linear-gradient(var(--surface-elevated), var(--surface-elevated)) padding-box, linear-gradient(120deg, var(--wave-from), var(--wave-to)) border-box',
                        padding: '11px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }
                    : {
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--surface-elevated)',
                        padding: '11px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--text-tertiary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={v.angulo}
                  >
                    {v.angulo || `Variação ${i + 1}`}
                  </span>
                  <DuracaoDoRoteiro blocos={v.blocos} />
                  {escolhida && (
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        color: 'var(--wave-from)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ★ escolha da Lia
                    </span>
                  )}
                </div>
                {v.blocos && v.blocos.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...v.blocos].sort((a, b) => a.ordem - b.ordem).map((b) => (
                      b.cena
                        ? <CenaDoRoteiro key={b.id} bloco={b} variacao={i} edicao={edicao} />
                        : <BlocoDaPeca key={b.id} bloco={b} variacao={i} edicao={edicao} />
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {v.texto}
                  </p>
                )}
                {v.ganchos?.length ? <GanchosDoRoteiro ganchos={v.ganchos} /> : null}
                {v.notas && (
                  
                  
                  <details>
                    <summary style={{ cursor: 'pointer', fontSize: 11, color: 'var(--text-tertiary)', listStyle: 'none' }}>
                      ver raciocínio
                    </summary>
                    <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                      {v.notas}
                    </p>
                  </details>
                )}
                {edicao && escolhida && <VoltarVersaoDaPeca peca={peca} edicao={edicao} />}
              </div>
            )
          })}
        </div>
      )}

      {}
      {peca.adPerf && (
        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '4px 14px',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            {peca.adPerf.roas !== undefined && <>ROAS {peca.adPerf.roas.toFixed(1)}x</>}
            {peca.adPerf.roas !== undefined && peca.adPerf.ctr !== undefined && <span style={{ margin: '0 4px', color: 'var(--border-hairline)' }}>·</span>}
            {peca.adPerf.ctr !== undefined && <>CTR {fmtPct(peca.adPerf.ctr)}</>}
            {(peca.adPerf.roas !== undefined || peca.adPerf.ctr !== undefined) && peca.adPerf.spend !== undefined && <span style={{ margin: '0 4px', color: 'var(--border-hairline)' }}>·</span>}
            {peca.adPerf.spend !== undefined && <>{fmtBRL(peca.adPerf.spend)}</>}
          </span>
          {peca.adPerf.veredito && (
            <span
              style={{
                display: 'inline-block',
                padding: '1px 7px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                color:
                  peca.adPerf.veredito === 'acima'
                    ? 'var(--approve)'
                    : peca.adPerf.veredito === 'abaixo'
                      ? 'rgb(214 158 46)'
                      : 'var(--text-tertiary)',
                background:
                  peca.adPerf.veredito === 'acima'
                    ? 'color-mix(in srgb, var(--approve) 14%, transparent)'
                    : peca.adPerf.veredito === 'abaixo'
                      ? 'color-mix(in srgb, rgb(214 158 46) 14%, transparent)'
                      : 'transparent',
                border:
                  peca.adPerf.veredito === 'acima'
                    ? '1px solid color-mix(in srgb, var(--approve) 30%, transparent)'
                    : peca.adPerf.veredito === 'abaixo'
                      ? '1px solid color-mix(in srgb, rgb(214 158 46) 30%, transparent)'
                      : '1px solid var(--border-hairline)',
              }}
            >
              {peca.adPerf.veredito} do normal
            </span>
          )}
        </div>
      )}

      {}
      {(peca.veredito.porque || peca.veredito.teste) && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface-elevated)',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
          }}
        >
          {peca.veredito.porque && (
            <div style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
              <Markdown chat>{peca.veredito.porque}</Markdown>
            </div>
          )}
          {peca.veredito.teste && (
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
              <span style={{ fontWeight: 600 }}>Teste:</span> {peca.veredito.teste}
            </p>
          )}
        </div>
      )}

      {}
      {temCritica && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              alignSelf: 'flex-start',
              display: 'inline-block',
              padding: '1px 7px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '0.02em',
              color: 'rgb(214 158 46)',
              background: 'color-mix(in srgb, rgb(214 158 46) 14%, transparent)',
              border: '1px solid color-mix(in srgb, rgb(214 158 46) 30%, transparent)',
            }}
          >
            revisado
          </span>
          <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {peca.critica.problemas!.map((p, i) => (
              <li key={i} style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </EstudioCard>
  )
}


function DuracaoDoRoteiro({ blocos }: { blocos?: PecaView['variacoes'][number]['blocos'] }) {
  const comCena = (blocos ?? []).filter((b) => b.cena)
  if (!comCena.length) return null
  const fim = Math.max(...comCena.map((b) => b.cena!.fimS))
  return (
    <span
      title="Estimativa pela fala, a 145 palavras por minuto."
      style={{ flexShrink: 0, marginLeft: 'auto', fontSize: 10.5, fontVariantNumeric: 'tabular-nums', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}
    >
      ~{formatarTimecode(fim)}
    </span>
  )
}



const KINDS_LONGOS = new Set(['corpo', 'primario', 'legenda', 'beat', 'slide'])


export interface EdicaoDaCopy {
  
  onEditarBloco: (variacao: number, blocoId: string, texto: string) => void
  
  onRestaurar: (n: number) => void
  ocupado: boolean
}


function VoltarVersaoDaPeca({ peca, edicao }: { peca: PecaView; edicao: EdicaoDaCopy }) {
  const [n, setN] = useState<number | ''>('')
  const anteriores = Array.from({ length: Math.max(0, peca.versaoAtual - 1) }, (_, i) => i + 1).reverse()
  if (!anteriores.length) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
      <select
        value={n}
        disabled={edicao.ocupado}
        onChange={(e) => setN(e.target.value ? Number(e.target.value) : '')}
        aria-label="Voltar para uma versão anterior"
        style={{ padding: '4px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)', color: 'var(--text-secondary)', fontSize: 11.5 }}
      >
        <option value="">Versão anterior…</option>
        {anteriores.map((v) => <option key={v} value={v}>Versão {v}</option>)}
      </select>
      <button
        type="button"
        disabled={edicao.ocupado || !n}
        onClick={() => { if (n) edicao.onRestaurar(n) }}
        style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)', background: 'transparent', color: n ? 'var(--text-secondary)' : 'var(--text-tertiary)', fontSize: 11.5, cursor: n ? 'pointer' : 'default' }}
      >
        Voltar
      </button>
      <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>Nada é apagado.</span>
    </div>
  )
}

function BlocoDaPeca({
  bloco, variacao, edicao,
}: {
  bloco: NonNullable<PecaView['variacoes'][number]['blocos']>[number]
  variacao: number
  edicao?: EdicaoDaCopy
}) {
  const [copiado, setCopiado] = useState(false)
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(bloco.texto)
  const estourou = bloco.limite !== undefined && bloco.texto.length > bloco.limite
  const longo = KINDS_LONGOS.has(bloco.kind)

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
        padding: '8px 10px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${estourou ? 'color-mix(in srgb, var(--reject) 40%, transparent)' : 'var(--border-hairline)'}`,
        background: 'var(--surface-elevated)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {bloco.rotulo}
        </span>
        {bloco.limite !== undefined && (
          <span
            title={estourou ? 'Passou do que a plataforma aceita' : 'Cabe no limite da plataforma'}
            style={{ flexShrink: 0, fontSize: 10.5, fontVariantNumeric: 'tabular-nums', color: estourou ? 'var(--reject)' : 'var(--text-tertiary)' }}
          >
            {bloco.texto.length}/{bloco.limite}
          </span>
        )}
        <button
          type="button"
          onClick={() => void copiar()}
          aria-label={`Copiar ${bloco.rotulo}`}
          style={{ flexShrink: 0, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 10.5, color: copiado ? 'var(--wave-from)' : 'var(--text-tertiary)', padding: 0 }}
        >
          {copiado ? 'copiado' : 'copiar'}
        </button>
        {edicao && !editando && (
          <button
            type="button"
            onClick={() => { setRascunho(bloco.texto); setEditando(true) }}
            aria-label={`Editar ${bloco.rotulo}`}
            title="Editar este campo. Não gera texto novo, então não custa nada."
            style={{ flexShrink: 0, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 10.5, color: 'var(--text-tertiary)', padding: 0 }}
          >
            editar
          </button>
        )}
      </div>
      {editando && edicao ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea
            value={rascunho}
            rows={longo ? 6 : 2}
            disabled={edicao.ocupado}
            autoFocus
            onChange={(e) => setRascunho(e.target.value)}
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
              disabled={edicao.ocupado || !rascunho.trim() || rascunho.trim() === bloco.texto}
              onClick={() => { edicao.onEditarBloco(variacao, bloco.id, rascunho); setEditando(false) }}
              style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)', color: 'var(--text-secondary)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
            >
              {edicao.ocupado ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type="button"
              disabled={edicao.ocupado}
              onClick={() => { setRascunho(bloco.texto); setEditando(false) }}
              style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', fontSize: 11.5, cursor: 'pointer', padding: 0 }}
            >
              Cancelar
            </button>
            {bloco.limite !== undefined && (
              <span style={{ marginLeft: 'auto', fontSize: 10.5, fontVariantNumeric: 'tabular-nums', color: rascunho.trim().length > bloco.limite ? 'var(--reject)' : 'var(--text-tertiary)' }}>
                {rascunho.trim().length}/{bloco.limite}
              </span>
            )}
          </div>
        </div>
      ) : longo ? (
        <div style={{ maxHeight: 260, overflowY: 'auto', fontSize: 13, lineHeight: 1.55, color: 'var(--text-primary)' }}>
          <Markdown chat>{bloco.texto}</Markdown>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
          {bloco.texto}
        </p>
      )}
    </div>
  )
}


function StatusBadge({ status }: { status: PecaView['status'] }) {
  const aprovada = status === 'aprovada'
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
        color: aprovada ? 'var(--approve)' : 'var(--text-secondary)',
        background: aprovada ? 'color-mix(in srgb, var(--approve) 14%, transparent)' : 'transparent',
        border: aprovada
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
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  accent?: 'approve'
  disabled?: boolean
}) {
  const [hover, setHover] = useState(false)
  const isApprove = accent === 'approve'
  const ativo = hover && !disabled
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.55 : 1,
        transition: 'color 140ms ease, border-color 140ms ease, background 140ms ease',
        color: isApprove && ativo ? 'var(--approve)' : ativo ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: isApprove && ativo ? 'color-mix(in srgb, var(--approve) 12%, transparent)' : 'transparent',
        border: `1px solid ${
          isApprove && ativo ? 'color-mix(in srgb, var(--approve) 40%, transparent)' : 'var(--border-hairline)'
        }`,
      }}
    >
      {children}
    </button>
  )
}
