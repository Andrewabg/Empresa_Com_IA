'use client'





import { useState } from 'react'
import type { CriativoView, SlideDoCarrossel } from '@/lib/design/types'
import { getFormatoDesign } from '@/lib/design/formatos'
import { ImgCriativo } from './ImgCriativo'
import { sufixoDoSlide } from '@/lib/design/legendaDaArte'

const ROTULO_DO_PAPEL: Record<SlideDoCarrossel['papel'], string> = {
  capa: 'Capa',
  miolo: 'Argumento',
  prova: 'Prova',
  cta: 'Fechamento',
}


function Btn({ children, onClick, disabled, titulo }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; titulo?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={titulo}
      style={{
        padding: '5px 11px', borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)',
        color: disabled ? 'var(--text-tertiary)' : 'var(--text-secondary)',
        fontSize: 11.5, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

export function CarrosselDaPeca({
  criativo, slides, onAbrir, onEditarSlide,
}: {
  criativo: CriativoView
  slides: SlideDoCarrossel[]
  onAbrir?: (artifactId: string) => void
  
  onEditarSlide?: (ordem: number) => void
}) {
  const [atual, setAtual] = useState(0)
  const ordenados = [...slides].sort((a, b) => a.ordem - b.ordem)
  const slide = ordenados[Math.min(atual, ordenados.length - 1)]
  if (!slide) return null
  const preset = getFormatoDesign(criativo.formato)
  const ratio = preset.alvoLargura / preset.alvoAltura
  const ir = (d: number) => setAtual((i) => Math.max(0, Math.min(ordenados.length - 1, i + d)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          Slide {slide.ordem} de {ordenados.length} · {ROTULO_DO_PAPEL[slide.papel]}
        </span>
        <a
          href={`/api/design/criativos/${criativo.id}/pacote`}
          style={{
            marginLeft: 'auto', padding: '5px 11px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)',
            color: 'var(--text-secondary)', fontSize: 11.5, fontWeight: 600, textDecoration: 'none',
          }}
          title="Baixa a série inteira num .zip, com os arquivos já numerados na ordem de publicação"
        >
          Baixar a série
        </a>
      </div>

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => onAbrir?.(slide.artifactId)}
          aria-label={`Abrir o slide ${slide.ordem} em tamanho real`}
          disabled={!onAbrir}
          style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'transparent', cursor: onAbrir ? 'zoom-in' : 'default' }}
        >
          <ImgCriativo
            artifactId={slide.artifactId}
            alt={`${criativo.titulo}${sufixoDoSlide(slide.ordem)}`}
            ratio={ratio}
            style={{ maxHeight: 420 }}
          />
        </button>
        {ordenados.length > 1 && (
          <>
            <SetaDeSlide lado="esquerda" disabled={atual === 0} onClick={() => ir(-1)} />
            <SetaDeSlide lado="direita" disabled={atual === ordenados.length - 1} onClick={() => ir(1)} />
          </>
        )}
      </div>

      {}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5 }}>
        {ordenados.map((s, i) => (
          <button
            key={s.ordem}
            type="button"
            onClick={() => setAtual(i)}
            aria-label={`Ir para o slide ${s.ordem}`}
            aria-current={i === atual}
            style={{
              width: 6, height: 6, padding: 0, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: i === atual ? 'var(--wave-from)' : 'var(--border-hairline)',
            }}
          />
        ))}
      </div>

      {}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {ordenados.map((s, i) => (
          <button
            key={s.ordem}
            type="button"
            onClick={() => setAtual(i)}
            aria-label={`Slide ${s.ordem}: ${ROTULO_DO_PAPEL[s.papel]}`}
            style={{
              flexShrink: 0, width: 54, padding: 2, cursor: 'pointer',
              borderRadius: 'var(--radius-sm)', background: 'transparent',
              border: `1px solid ${i === atual ? 'var(--wave-from)' : 'var(--border-hairline)'}`,
            }}
          >
            <ImgCriativo artifactId={s.artifactId} alt="" ratio={ratio} />
          </button>
        ))}
      </div>

      {(slide.documento.blocos.headline || slide.documento.blocos.subheadline) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {slide.documento.blocos.headline && (
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.4, color: 'var(--text-secondary)', fontWeight: 600 }}>
              {slide.documento.blocos.headline}
            </p>
          )}
          {slide.documento.blocos.subheadline && (
            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.45, color: 'var(--text-tertiary)' }}>
              {slide.documento.blocos.subheadline}
            </p>
          )}
        </div>
      )}

      {onEditarSlide && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Btn onClick={() => onEditarSlide(slide.ordem)} titulo="Editar o texto deste slide. Não gera imagem nova, então não custa nada.">
            Editar este slide
          </Btn>
          <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>Editar texto não custa nada.</span>
        </div>
      )}
    </div>
  )
}

function SetaDeSlide({ lado, disabled, onClick }: { lado: 'esquerda' | 'direita'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={lado === 'esquerda' ? 'Slide anterior' : 'Próximo slide'}
      style={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        ...(lado === 'esquerda' ? { left: 6 } : { right: 6 }),
        width: 28, height: 28, borderRadius: '50%',
        border: '1px solid var(--border-hairline)',
        background: 'color-mix(in srgb, var(--surface-elevated) 82%, transparent)',
        color: disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
        fontSize: 13, lineHeight: 1, cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {lado === 'esquerda' ? '‹' : '›'}
    </button>
  )
}
