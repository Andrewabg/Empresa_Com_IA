'use client'













import { margensSeguras } from '@/lib/design/zonaSegura'

export const COPY_MOCKUP = {
  simulacao: 'Simulação de como a peça aparece no aplicativo. As proporções são reais; a interface é aproximada.',
  zonaLigada: 'As faixas escuras marcam onde o aplicativo desenha por cima da sua arte.',
  semArte: 'Esta peça ainda não tem arte.',
} as const

interface Props {
  
  formato: string
  
  src?: string | null
  
  nomeDaMarca?: string
  
  mostrarZona?: boolean
  
  largura?: number
}

const CINZA = 'rgba(255,255,255,0.14)'


function BarrasDoStory() {
  return (
    <div style={{ display: 'flex', gap: 3, padding: '8px 10px 0' }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: i === 0 ? 'rgba(255,255,255,0.85)' : CINZA }} />
      ))}
    </div>
  )
}


function LinhaDoPerfil({ nome, escuro }: { nome: string; escuro: boolean }) {
  const cor = escuro ? 'rgba(255,255,255,0.9)' : 'var(--text-primary)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
      <span style={{ width: 22, height: 22, borderRadius: 999, background: CINZA, flexShrink: 0 }} />
      <span style={{ fontSize: 11.5, fontWeight: 600, color: cor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {nome || '—'}
      </span>
    </div>
  )
}

export function PlacementMockup({ formato, src, nomeDaMarca = '', mostrarZona = false, largura = 240 }: Props) {
  const m = margensSeguras(formato)
  const vertical = m.plataformaCobre
  
  
  const razao = vertical ? 16 / 9 : formato === 'post-quadrado' ? 1 : 5 / 4
  const alturaDaArte = Math.round(largura * razao)

  const zona = mostrarZona && (
    <>
      <span style={{ position: 'absolute', left: 0, right: 0, top: 0, height: `${m.topo * 100}%`, background: 'rgba(0,0,0,0.55)' }} />
      <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${m.base * 100}%`, background: 'rgba(0,0,0,0.55)' }} />
      <span style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${m.laterais * 100}%`, background: 'rgba(0,0,0,0.4)' }} />
      <span style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${m.laterais * 100}%`, background: 'rgba(0,0,0,0.4)' }} />
    </>
  )

  return (
    <figure style={{ margin: 0, width: largura, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          borderRadius: 'var(--radius-md)', overflow: 'hidden',
          border: '1px solid var(--border-hairline)',
          background: vertical ? '#0b0b0d' : 'var(--surface)',
        }}
      >
        {!vertical && <LinhaDoPerfil nome={nomeDaMarca} escuro={false} />}
        <div style={{ position: 'relative', width: largura, height: alturaDaArte, background: '#0b0b0d' }}>
          {vertical && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }}>
              <BarrasDoStory />
              <LinhaDoPerfil nome={nomeDaMarca} escuro />
            </div>
          )}
          {src
            ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : (
              <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
                {COPY_MOCKUP.semArte}
              </span>
            )}
          {zona}
          {vertical && (
            
            <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, height: 30, borderRadius: 999, border: `1px solid ${CINZA}`, zIndex: 2 }} />
          )}
        </div>
        {!vertical && (
          
          <div style={{ display: 'flex', gap: 10, padding: '9px 10px 12px' }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 16, height: 16, borderRadius: 4, background: CINZA }} />
            ))}
          </div>
        )}
      </div>
      <figcaption style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
        {COPY_MOCKUP.simulacao}
        {mostrarZona ? ` ${COPY_MOCKUP.zonaLigada}` : ''}
      </figcaption>
    </figure>
  )
}
