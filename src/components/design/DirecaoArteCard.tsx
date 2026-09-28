'use client'





import { useId, useState, type ReactNode } from 'react'
import { direcaoArteVazia, temAtivoDaMarca, type DirecaoArte, type DesignLearning, type PapelDaCor } from '@/lib/design/direcaoArte'
import { FAMILIAS_DE_FONTE, type PapelDeFonte } from '@/lib/design/fontes'
import { WaveMark } from '@/components/copy/EstudioCard'
import { useArtifactUrl } from './useArtifactUrl'
import { TIPOS_DE_IMAGEM } from '@/lib/design/uploadDeImagem'


export interface DirecaoArteEdicao {
  onSubirLogo: (file: File, mono: boolean) => void
  onAceitarCor: (hex: string, papel: PapelDaCor | '') => void
  onRemoverCor: (hex: string) => void
  onDefinirTipografia: (display: string, corpo: string) => void
  
  sugestao?: { hex: string; peso: number }[]
  
  ocupado?: boolean
}


const ACCEPT_IMAGEM = Object.keys(TIPOS_DE_IMAGEM).join(',')

const PAPEIS: { valor: PapelDaCor; rotulo: string }[] = [
  { valor: 'primaria', rotulo: 'Cor principal' },
  { valor: 'secundaria', rotulo: 'Cor de apoio' },
  { valor: 'fundo', rotulo: 'Fundo' },
  { valor: 'texto', rotulo: 'Texto' },
  { valor: 'destaque', rotulo: 'Botão e destaque' },
]

const PAPEL_ROTULO: Record<PapelDaCor, string> = {
  primaria: 'principal', secundaria: 'apoio', fundo: 'fundo', texto: 'texto', destaque: 'destaque',
}


function Swatch({ nome, hex, papel }: { nome: string; hex: string; papel?: PapelDaCor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span
        title={`${nome} — ${hex}`}
        style={{
          display: 'inline-block',
          width: 22,
          height: 22,
          flexShrink: 0,
          borderRadius: 6,
          background: hex,
          border: '1px solid var(--border-hairline)',
        }}
      />
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.3, minWidth: 0 }}>
        {nome}
        {papel && (
          <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--wave-from)' }}>{PAPEL_ROTULO[papel]}</span>
        )}
        <span
          style={{
            marginLeft: 6,
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 11,
            color: 'var(--text-tertiary)',
          }}
        >
          {hex}
        </span>
      </span>
    </div>
  )
}


function Campo({ label, valor }: { label: string; valor?: string }) {
  if (!valor) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-primary)' }}>{valor}</span>
    </div>
  )
}


function SecaoTitulo({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--text-tertiary)',
        paddingTop: 2,
        borderTop: '1px solid var(--border-hairline)',
        display: 'block',
      }}
    >
      {children}
    </span>
  )
}


function RemoverBtn({ onClick, rotulo = 'Remover aprendizado' }: { onClick: () => void; rotulo?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      style={{
        flexShrink: 0,
        width: 22,
        height: 22,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-hairline)',
        background: 'transparent',
        color: 'var(--text-tertiary)',
        fontSize: 13,
        lineHeight: 1,
        cursor: 'pointer',
        transition: 'color 140ms ease, border-color 140ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--reject)'
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--reject) 40%, transparent)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--text-tertiary)'
        e.currentTarget.style.borderColor = 'var(--border-hairline)'
      }}
    >
      ×
    </button>
  )
}

const ORIGEM_LABEL: Record<DesignLearning['origem'], string> = {
  entrevista: 'entrevista',
  revisao: 'revisão',
  operador: 'você',
  reflector: 'performance real',
}


function AprendizadoItem({
  aprendizado,
  onRemover,
}: {
  aprendizado: DesignLearning
  onRemover?: () => void
}) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        fontSize: 13,
        lineHeight: 1.5,
        color: 'var(--text-secondary)',
      }}
    >
      <span aria-hidden style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 1 }}>
        •
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
        <span>{aprendizado.texto}</span>
        <span
          style={{
            display: 'inline-block',
            padding: '1px 7px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 10.5,
            lineHeight: 1.4,
            color: 'var(--text-tertiary)',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-hairline)',
            alignSelf: 'flex-start',
            whiteSpace: 'nowrap',
          }}
        >
          {ORIGEM_LABEL[aprendizado.origem]}
        </span>
      </div>
      {onRemover && <RemoverBtn onClick={onRemover} />}
    </li>
  )
}


function BotaoFicha({
  children, onClick, disabled, title,
}: { children: ReactNode; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: '5px 10px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-hairline)',
        background: 'transparent',
        color: disabled ? 'var(--text-tertiary)' : 'var(--text-secondary)',
        fontSize: 11.5,
        lineHeight: 1.3,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}


function SecaoLogo({
  artifactId, mono, ocupado, onSubir,
}: { artifactId?: string; mono: boolean; ocupado?: boolean; onSubir?: (f: File, mono: boolean) => void }) {
  const id = useId()
  const url = useArtifactUrl(artifactId ?? '')
  const rotulo = mono ? 'Logo de uma cor' : 'Logo'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 44, height: 44, flexShrink: 0,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-hairline)',
          
          
          backgroundColor: 'var(--surface-elevated)',
          backgroundImage:
            'linear-gradient(45deg, rgb(255 255 255 / 0.05) 25%, transparent 25%, transparent 75%, rgb(255 255 255 / 0.05) 75%)',
          backgroundSize: '8px 8px',
          display: 'grid', placeItems: 'center', overflow: 'hidden',
        }}
      >
        {artifactId && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={rotulo + ' da marca'}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <span aria-hidden style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            {artifactId ? '...' : '+'}
          </span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{rotulo}</span>
        {onSubir && (
          <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
            {mono ? 'Para fundo escuro. Opcional.' : 'PNG com fundo transparente fica melhor.'}
          </span>
        )}
      </div>

      {onSubir && <input
        id={id}
        type="file"
        accept={ACCEPT_IMAGEM}
        disabled={ocupado}
        onChange={(e) => {
          const f = e.target.files?.[0]
          
          
          e.target.value = ''
          if (f) onSubir(f, mono)
        }}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />}
      {onSubir && <label
        htmlFor={id}
        style={{
          flexShrink: 0,
          padding: '5px 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-hairline)',
          color: ocupado ? 'var(--text-tertiary)' : 'var(--text-secondary)',
          fontSize: 11.5,
          cursor: ocupado ? 'not-allowed' : 'pointer',
          opacity: ocupado ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {artifactId ? 'Trocar' : 'Escolher arquivo'}
      </label>}
    </div>
  )
}


function CorSugerida({
  hex, peso, ocupado, onAceitar,
}: { hex: string; peso: number; ocupado?: boolean; onAceitar: (hex: string, papel: PapelDaCor | '') => void }) {
  const [papel, setPapel] = useState<PapelDaCor | ''>('')
  const id = useId()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
      <span
        aria-hidden
        style={{
          width: 22, height: 22, flexShrink: 0, borderRadius: 6,
          background: hex, border: '1px solid var(--border-hairline)',
        }}
      />
      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
        {hex}
      </span>
      <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', flexShrink: 0 }}>
        {Math.round(peso * 100)}% do logo
      </span>
      <label htmlFor={id} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>
        Onde usar a cor {hex}
      </label>
      <select
        id={id}
        value={papel}
        disabled={ocupado}
        onChange={(e) => setPapel(e.target.value as PapelDaCor | '')}
        style={{
          flex: 1, minWidth: 110, marginLeft: 'auto',
          padding: '4px 6px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface-elevated)',
          color: 'var(--text-secondary)',
          fontSize: 11.5,
        }}
      >
        <option value="">Onde usar?</option>
        {PAPEIS.map((x) => <option key={x.valor} value={x.valor}>{x.rotulo}</option>)}
      </select>
      <BotaoFicha onClick={() => onAceitar(hex, papel)} disabled={ocupado} title="Adicionar à paleta da marca">
        Adicionar
      </BotaoFicha>
    </div>
  )
}


function SeletorDeFonte({
  label, valor, papel, ocupado, onChange,
}: {
  label: string
  valor: string
  papel: PapelDeFonte
  ocupado?: boolean
  onChange: (v: string) => void
}) {
  const id = useId()
  const opcoes = FAMILIAS_DE_FONTE.filter((f) => f.papeis.includes(papel))
  
  
  const herdado = valor.trim() && !opcoes.some((f) => f.familia === valor.trim()) ? valor.trim() : ''
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 150, flex: 1 }}>
      <label htmlFor={id} style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{label}</label>
      <select
        id={id}
        value={herdado || valor.trim()}
        disabled={ocupado}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '5px 6px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface-elevated)',
          color: 'var(--text-secondary)',
          fontSize: 12,
        }}
      >
        <option value="">Deixar o Téo escolher</option>
        {herdado && <option value={herdado}>{herdado} (não está instalada)</option>}
        {opcoes.map((f) => (
          <option key={f.slug} value={f.familia} title={f.descricao}>{f.rotulo}</option>
        ))}
      </select>
    </div>
  )
}


function TipografiaLeitura({ display, corpo }: { display?: string; corpo?: string }) {
  const linhas = [
    ['Fonte dos títulos', display?.trim()],
    ['Fonte do texto', corpo?.trim()],
  ].filter((l): l is [string, string] => !!l[1])
  if (linhas.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {linhas.map(([rotulo, familia]) => (
        <div key={rotulo} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{rotulo}</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{familia}</span>
        </div>
      ))}
    </div>
  )
}


function SecaoTipografia({
  display, corpo, ocupado, onSalvar,
}: { display?: string; corpo?: string; ocupado?: boolean; onSalvar: (display: string, corpo: string) => void }) {
  const [d, setD] = useState(display ?? '')
  const [c, setC] = useState(corpo ?? '')
  const mudou = d.trim() !== (display ?? '').trim() || c.trim() !== (corpo ?? '').trim()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
      <SeletorDeFonte label="Fonte dos títulos" valor={d} papel="display" ocupado={ocupado} onChange={setD} />
      <SeletorDeFonte label="Fonte do texto" valor={c} papel="corpo" ocupado={ocupado} onChange={setC} />
      <BotaoFicha onClick={() => onSalvar(d.trim(), c.trim())} disabled={ocupado || !mudou}>
        Salvar
      </BotaoFicha>
    </div>
  )
}



function FichaConteudo({
  direcao,
  onRemoverAprendizado,
  edicao,
}: {
  direcao: DirecaoArte
  onRemoverAprendizado?: (texto: string) => void
  edicao?: DirecaoArteEdicao
}) {
  const temPaleta = (direcao.paleta?.length ?? 0) > 0
  const sugestao = edicao?.sugestao ?? []
  const temAprendizados = (direcao.aprendizados?.length ?? 0) > 0
  const temProibicoes = (direcao.proibicoes?.length ?? 0) > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
      {}
      {edicao && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SecaoTitulo>A marca</SecaoTitulo>
          <SecaoLogo artifactId={direcao.logoArtifactId} mono={false} ocupado={edicao.ocupado} onSubir={edicao.onSubirLogo} />
          <SecaoLogo artifactId={direcao.logoMonoArtifactId} mono ocupado={edicao.ocupado} onSubir={edicao.onSubirLogo} />
          {}
          <SecaoTipografia
            key={(direcao.tipografia?.display ?? '') + '|' + (direcao.tipografia?.corpo ?? '')}
            display={direcao.tipografia?.display}
            corpo={direcao.tipografia?.corpo}
            ocupado={edicao.ocupado}
            onSalvar={edicao.onDefinirTipografia}
          />
        </div>
      )}
      {}
      {!edicao && temAtivoDaMarca(direcao) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SecaoTitulo>A marca</SecaoTitulo>
          {direcao.logoArtifactId && <SecaoLogo artifactId={direcao.logoArtifactId} mono={false} />}
          {direcao.logoMonoArtifactId && <SecaoLogo artifactId={direcao.logoMonoArtifactId} mono />}
          <TipografiaLeitura display={direcao.tipografia?.display} corpo={direcao.tipografia?.corpo} />
        </div>
      )}

      {}
      {(temPaleta || sugestao.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SecaoTitulo>Paleta</SecaoTitulo>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(direcao.paleta ?? []).map((c, i) => (
              <div key={`${c.hex}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Swatch nome={c.nome} hex={c.hex} papel={c.papel} />
                </div>
                {edicao && (
                  <RemoverBtn
                    onClick={() => edicao.onRemoverCor(c.hex)}
                    rotulo={`Tirar a cor ${c.hex} da paleta`}
                  />
                )}
              </div>
            ))}
          </div>

          {edicao && sugestao.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
              <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
                Estas cores estão no arquivo do seu logo. Diga onde cada uma se usa e ela entra na paleta.
              </p>
              {sugestao.map((c) => (
                <CorSugerida
                  key={c.hex}
                  hex={c.hex}
                  peso={c.peso}
                  ocupado={edicao.ocupado}
                  onAceitar={edicao.onAceitarCor}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {}
      <Campo label="Estilo fotográfico" valor={direcao.estiloFotografico} />
      <Campo label="Iluminação" valor={direcao.iluminacao} />
      <Campo label="Composição" valor={direcao.composicao} />
      <Campo label="Mood" valor={direcao.mood} />
      <Campo label="Assinatura" valor={direcao.assinatura} />

      {}
      {temProibicoes && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SecaoTitulo>Nunca fazer</SecaoTitulo>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {direcao.proibicoes!.map((p, i) => (
              <li
                key={`${p}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                }}
              >
                <span aria-hidden style={{ color: 'var(--reject)', fontWeight: 600, flexShrink: 0 }}>
                  ✗
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {}
      {temAprendizados && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SecaoTitulo>Aprendizados</SecaoTitulo>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {direcao.aprendizados.map((a, i) => (
              <AprendizadoItem
                key={`${a.texto}-${i}`}
                aprendizado={a}
                onRemover={onRemoverAprendizado ? () => onRemoverAprendizado(a.texto) : undefined}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}


export function DirecaoArteCard({
  direcao,
  onRemoverAprendizado,
  edicao,
}: {
  direcao: DirecaoArte | null
  
  onRemoverAprendizado?: (texto: string) => void
  
  edicao?: DirecaoArteEdicao
}) {
  const vazio = direcaoArteVazia(direcao)

  return (
    <section
      aria-label="Direção de arte"
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
          Direção de arte
        </span>
      </header>

      {vazio && (
        <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--text-tertiary)' }}>
          {edicao
            ? 'O Téo ainda está conhecendo a cara da marca. Suba o logo aqui embaixo, ou converse com ele no estúdio.'
            : 'O Téo ainda está conhecendo a cara da marca. Converse com ele no estúdio.'}
        </p>
      )}
      {(!vazio || edicao) && (
        <FichaConteudo
          direcao={direcao ?? { aprendizados: [] }}
          onRemoverAprendizado={onRemoverAprendizado}
          edicao={edicao}
        />
      )}
    </section>
  )
}
