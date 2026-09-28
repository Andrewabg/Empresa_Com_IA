'use client'




import { useState } from 'react'
import type { CriativoView, VariacaoCriativo } from '@/lib/design/types'
import { getFormatoDesign, aspectRatioDoSize, aspectRatioDoFormato } from '@/lib/design/formatos'
import { artifactFilename } from '@/lib/artifacts'
import { EstudioCard } from '@/components/copy/EstudioCard'
import { useArtifactUrl, baixarArtifact } from './useArtifactUrl'
import { ImgCriativo } from './ImgCriativo'
import { EditorDeArte, type EdicaoDaArte } from './EditorDeArte'
import { AjusteDaArte } from './AjusteDaArte'
import { COPY_AJUSTE } from '@/lib/design/copyDoAjuste'
import { CarrosselDaPeca } from './CarrosselDaPeca'
import { SUFIXO_ARTE_FINAL, sufixoDoConceito } from '@/lib/design/legendaDaArte'

const STATUS_LABEL: Record<CriativoView['status'], string> = {
  brief: 'Brief',
  rascunho: 'Rascunho',
  revisao: 'Em revisão',
  aprovada: 'Aprovada',
  arquivada: 'Arquivada',
}

export interface CriativoCardProps {
  criativo: CriativoView
  emFoco: boolean
  onFinalizar: (id: string, variacao: number) => void
  
  finalizandoId: string | null
  onRevisar: (id: string) => void
  onArquivar: (id: string) => void
  
  onLancar?: (artifactId: string) => void
  
  lancandoArtifactId?: string | null
  
  onAbrir?: (artifactId: string) => void
  
  edicao?: EdicaoDaArte
}


function ratioDaArte(variacao: VariacaoCriativo, formato: string): number {
  return aspectRatioDoSize(variacao.size) ?? aspectRatioDoFormato(formato)
}


function ArteClicavel({
  onAbrir,
  artifactId,
  rotulo,
  children,
}: {
  onAbrir?: (artifactId: string) => void
  artifactId: string
  rotulo: string
  children: React.ReactNode
}) {
  if (!onAbrir) return <>{children}</>
  return (
    <button
      type="button"
      onClick={() => onAbrir(artifactId)}
      aria-label={rotulo}
      title="Abrir em tamanho real"
      style={{
        display: 'block', width: '100%', padding: 0,
        border: 'none', background: 'transparent', cursor: 'zoom-in',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {children}
    </button>
  )
}


function AcaoBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '5px 11px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
        fontWeight: 500,
        fontFamily: 'var(--font-ui)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.5 : 1,
        transition: 'color 140ms ease, border-color 140ms ease, background 140ms ease',
        color: hover && !disabled ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: 'transparent',
        border: `1px solid ${hover && !disabled ? 'var(--text-tertiary)' : 'var(--border-hairline)'}`,
      }}
    >
      {children}
    </button>
  )
}


function StatusBadge({ status }: { status: CriativoView['status'] }) {
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


function SeloArteFinal() {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        
        border: '1px solid transparent',
        background:
          'linear-gradient(var(--surface-elevated), var(--surface-elevated)) padding-box, linear-gradient(120deg, var(--wave-from), var(--wave-to)) border-box',
        color: 'var(--wave-from)',
      }}
    >
      Arte final
    </span>
  )
}


function AdCopy({ variacao }: { variacao: VariacaoCriativo }) {
  if (!variacao.headline && !variacao.cta && !variacao.framework) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
      {variacao.framework && (
        <span style={{ alignSelf: 'flex-start', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: '1px 6px' }}>
          {variacao.framework}
        </span>
      )}
      {variacao.headline && (
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.35, color: 'var(--text-primary)' }}>{variacao.headline}</p>
      )}
      {variacao.subheadline && (
        <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.4, color: 'var(--text-secondary)' }}>{variacao.subheadline}</p>
      )}
      {variacao.cta && (
        <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', background: 'var(--surface-elevated)', border: '1px solid var(--border-hairline)', borderRadius: 99, padding: '2px 10px', marginTop: 2 }}>
          {variacao.cta} →
        </span>
      )}
    </div>
  )
}


function ProvaCard({
  variacao,
  index,
  criativo,
  escolhida,
  finalizandoId,
  onFinalizar,
  onAbrir,
}: {
  variacao: VariacaoCriativo
  index: number
  criativo: CriativoView
  escolhida: boolean
  finalizandoId: string | null
  onFinalizar: (id: string, variacao: number) => void
  onAbrir?: (artifactId: string) => void
}) {
  const finalizando = finalizandoId === criativo.id
  const alt = `${criativo.titulo}${sufixoDoConceito(variacao.conceito)}`

  return (
    <div
      style={
        escolhida
          ? {
              
              border: '1px solid transparent',
              borderRadius: 'var(--radius-md)',
              background:
                'linear-gradient(var(--surface-elevated), var(--surface-elevated)) padding-box, linear-gradient(120deg, var(--wave-from), var(--wave-to)) border-box',
              padding: '10px 11px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }
          : {
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-elevated)',
              padding: '10px 11px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }
      }
    >
      {}
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
          title={variacao.conceito}
        >
          {variacao.conceito || `Variação ${index + 1}`}
        </span>
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
            ★ escolha do Téo
          </span>
        )}
      </div>

      {}
      <ArteClicavel onAbrir={onAbrir} artifactId={variacao.artifactId} rotulo={`Abrir em tamanho real: ${alt}`}>
        <ImgCriativo
          artifactId={variacao.artifactId}
          alt={alt}
          ratio={ratioDaArte(variacao, criativo.formato)}
          style={{ maxHeight: 340 }}
        />
      </ArteClicavel>

      <AdCopy variacao={variacao} />

      {}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <AcaoBtn
          onClick={() => onFinalizar(criativo.id, index)}
          disabled={finalizando}
        >
          {finalizando ? 'Finalizando…' : 'Finalizar em alta'}
        </AcaoBtn>
        <AcaoBtn
          onClick={() =>
            void baixarArtifact(variacao.artifactId, artifactFilename(criativo.titulo, 'imagem'))
          }
        >
          Baixar
        </AcaoBtn>
      </div>
    </div>
  )
}


function SerieDaPeca({
  criativo, slides, variacao, onAbrir, edicao,
}: {
  criativo: CriativoView
  slides: NonNullable<VariacaoCriativo['slides']>
  variacao: number
  onAbrir?: (artifactId: string) => void
  edicao?: EdicaoDaArte
}) {
  const [emEdicao, setEmEdicao] = useState<number | null>(null)
  const ordenados = [...slides].sort((a, b) => a.ordem - b.ordem)
  const alvo = ordenados.find((s) => s.ordem === emEdicao)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <CarrosselDaPeca
        criativo={criativo}
        slides={ordenados}
        onAbrir={onAbrir}
        {...(edicao ? { onEditarSlide: (ordem: number) => setEmEdicao((a) => (a === ordem ? null : ordem)) } : {})}
      />
      {edicao && alvo && (
        <EditorDeArte
          key={alvo.ordem}
          criativo={criativo}
          variacao={variacao}
          documento={alvo.documento}
          edicao={edicao}
          slide={alvo.ordem}
          rotuloDoBotao={`Editar o slide ${alvo.ordem}`}
        />
      )}
    </div>
  )
}

export function CriativoCard({
  criativo,
  emFoco,
  onFinalizar,
  finalizandoId,
  onRevisar,
  onArquivar,
  onLancar,
  lancandoArtifactId,
  onAbrir,
  edicao,
}: CriativoCardProps) {
  const formatoNome = getFormatoDesign(criativo.formato).nome

  
  
  const idxSerie = criativo.variacoes.findIndex((v) => Array.isArray(v.slides) && v.slides.length)
  const serie = idxSerie >= 0 ? criativo.variacoes[idxSerie]!.slides! : null

  
  let arteFinalIdx = -1
  for (let i = criativo.variacoes.length - 1; i >= 0; i--) {
    if (criativo.variacoes[i].final) { arteFinalIdx = i; break }
  }
  const hasArteFinal = arteFinalIdx >= 0
  const arteFinal = hasArteFinal ? criativo.variacoes[arteFinalIdx] : null

  
  const provas = hasArteFinal
    ? criativo.variacoes.filter((_, i) => i !== arteFinalIdx)
    : criativo.variacoes

  
  const escolhidaIdx =
    typeof criativo.veredito.escolhida === 'number' &&
    criativo.veredito.escolhida >= 0 &&
    criativo.variacoes[criativo.veredito.escolhida] !== undefined
      ? criativo.veredito.escolhida
      : -1

  return (
    <EstudioCard
      eyebrow={formatoNome}
      dim={criativo.status === 'arquivada'}
      headerRight={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {criativo.referenciaId && (
            <span
              style={{
                display: 'inline-block',
                padding: '1px 7px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
              }}
            >
              remix
            </span>
          )}
          <StatusBadge status={criativo.status} />
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            v{criativo.versaoAtual}
          </span>
        </span>
      }
      footer={
        emFoco ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <AcaoBtn onClick={() => onRevisar(criativo.id)}>Pedir mudança</AcaoBtn>
            {criativo.status !== 'arquivada' && (
              <AcaoBtn onClick={() => onArquivar(criativo.id)}>Arquivar</AcaoBtn>
            )}
          </div>
        ) : undefined
      }
    >
      {}
      {criativo.titulo && (
        <h2
          style={{
            margin: '-2px 0 12px',
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.3,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {criativo.titulo}
        </h2>
      )}

      {criativo.variacoes.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-tertiary)' }}>
          O Téo ainda está gerando este criativo.
        </p>
      ) : serie ? (
        
        <SerieDaPeca
          criativo={criativo}
          slides={serie}
          variacao={idxSerie}
          onAbrir={onAbrir}
          edicao={edicao}
        />
      ) : hasArteFinal && arteFinal ? (
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <SeloArteFinal />
              <div style={{ display: 'flex', gap: 8 }}>
                {}
                {onLancar && (
                  <AcaoBtn
                    onClick={() => onLancar(arteFinal.artifactId)}
                    disabled={lancandoArtifactId === arteFinal.artifactId}
                  >
                    {lancandoArtifactId === arteFinal.artifactId ? 'Preparando…' : 'Lançar como anúncio'}
                  </AcaoBtn>
                )}
                <AcaoBtn
                  onClick={() =>
                    void baixarArtifact(
                      arteFinal.artifactId,
                      artifactFilename(criativo.titulo, 'imagem'),
                    )
                  }
                >
                  Baixar
                </AcaoBtn>
              </div>
            </div>
            <ArteClicavel onAbrir={onAbrir} artifactId={arteFinal.artifactId} rotulo={`Abrir em tamanho real: ${criativo.titulo}, arte final`}>
              <ImgCriativo
                artifactId={arteFinal.artifactId}
                alt={`${criativo.titulo}${SUFIXO_ARTE_FINAL}`}
                ratio={ratioDaArte(arteFinal, criativo.formato)}
                style={{ maxHeight: 'min(70dvh, 900px)' }}
              />
            </ArteClicavel>
            <AdCopy variacao={arteFinal} />
            {edicao && arteFinal.documento && (
              <EditorDeArte
                criativo={criativo}
                variacao={arteFinalIdx}
                documento={arteFinal.documento}
                edicao={edicao}
              />
            )}
            {}
            {edicao && (
              <AjusteDaArte
                variacao={arteFinalIdx}
                ocupado={edicao.ocupado}
                onRemixar={edicao.onRemixar}
              />
            )}
          </div>

          {}
          {provas.length > 0 && (
            <details>
              <summary
                style={{
                  fontSize: 11.5,
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  listStyle: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span aria-hidden style={{ fontSize: 10 }}>›</span>
                ver provas anteriores ({provas.length})
              </summary>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 10,
                  marginTop: 10,
                }}
              >
                {provas.map((v, i) => (
                  <div
                    key={`prova-${i}-${v.conceito}`}
                    style={{
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-elevated)',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
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
                      title={v.conceito}
                    >
                      {v.conceito || `Variação ${i + 1}`}
                    </span>
                    <ArteClicavel onAbrir={onAbrir} artifactId={v.artifactId} rotulo={`Abrir em tamanho real: ${criativo.titulo}, ${v.conceito}`}>
                      <ImgCriativo
                        artifactId={v.artifactId}
                        alt={`${criativo.titulo}${sufixoDoConceito(v.conceito)}`}
                        ratio={ratioDaArte(v, criativo.formato)}
                        style={{ maxHeight: 220 }}
                      />
                    </ArteClicavel>
                    <AdCopy variacao={v} />
                    <AcaoBtn
                      onClick={() =>
                        void baixarArtifact(v.artifactId, artifactFilename(criativo.titulo, 'imagem'))
                      }
                    >
                      Baixar
                    </AcaoBtn>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      ) : (
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {provas.map((v, i) => (
              <ProvaCard
                key={`prova-${i}-${v.conceito}`}
                variacao={v}
                index={i}
                criativo={criativo}
                escolhida={i === escolhidaIdx}
                finalizandoId={finalizandoId}
                onFinalizar={onFinalizar}
                onAbrir={onAbrir}
              />
            ))}
          </div>

          {}
          {edicao && escolhidaIdx >= 0 && criativo.variacoes[escolhidaIdx]?.documento && (
            <EditorDeArte
              criativo={criativo}
              variacao={escolhidaIdx}
              documento={criativo.variacoes[escolhidaIdx].documento!}
              edicao={edicao}
            />
          )}

          {}
          {edicao && escolhidaIdx >= 0 && (
            <AjusteDaArte
              variacao={escolhidaIdx}
              ocupado={edicao.ocupado}
              onRemixar={edicao.onRemixar}
              rotuloDoBotao={COPY_AJUSTE.abrirProva}
            />
          )}

          {}
          {criativo.veredito.porque && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
              }}
            >
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                {criativo.veredito.porque}
              </p>
            </div>
          )}

          {}
          {criativo.critica.aprovado === false && !!criativo.critica.problemas?.length && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                o Téo revisou
              </span>
              <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {criativo.critica.problemas!.map((p, i) => (
                  <li key={i} style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </EstudioCard>
  )
}
