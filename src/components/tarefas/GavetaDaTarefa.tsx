'use client'


import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Markdown } from '@/components/markdown/Markdown'
import { COPY_TAREFAS, ROTULO_DO_STATUS } from '@/lib/tarefas/copy'
import { duracaoLegivel, horaLegivel } from '@/lib/tarefas/formato'
import type { ArvoreDaTarefa, NoDaArvore, StatusTarefa } from '@/lib/tarefas/linhaDoTempo'

export interface AgenteNomeado { id: string; nome: string }

interface Props {
  arvore: ArvoreDaTarefa
  agentes: AgenteNomeado[]
  ehDono: boolean
  aoFechar: () => void
  
  aoCancelar?: (raizId: string) => Promise<void>
}


function corDoStatus(status: StatusTarefa): string {
  if (status === 'failed') return 'var(--danger, #ff6b6b)'
  if (status === 'needs_approval') return 'var(--wave-to)'
  if (status === 'cancelled') return 'var(--text-tertiary)'
  return 'var(--text-secondary)'
}


function achatar(no: NoDaArvore, nivel = 0): Array<{ no: NoDaArvore; nivel: number }> {
  return [{ no, nivel }, ...no.filhos.flatMap((f) => achatar(f, nivel + 1))]
}

export function GavetaDaTarefa({ arvore, agentes, ehDono, aoFechar, aoCancelar }: Props) {
  const linhas = achatar(arvore.raiz)
  const [selecionado, setSelecionado] = useState<string>(arvore.travadoEm ?? arvore.raiz.id)
  const [cancelando, setCancelando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const no = linhas.find((l) => l.no.id === selecionado)?.no ?? arvore.raiz
  const nomeDoAgente = (id: string) => agentes.find((a) => a.id === id)?.nome ?? id
  const raizTerminal = ['done', 'failed', 'cancelled'].includes(arvore.raiz.status)

  async function cancelar() {
    if (!aoCancelar) return
    setCancelando(true)
    setAviso(null)
    try {
      await aoCancelar(arvore.raiz.id)
    } catch {
      setAviso(COPY_TAREFAS.falhaAoCancelar)
    } finally {
      setCancelando(false)
    }
  }

  return (
    <aside
      aria-label={COPY_TAREFAS.tituloDaPagina}
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(560px, 100vw)', zIndex: 40,
        background: 'var(--surface)', borderLeft: '1px solid var(--border-hairline)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '-24px 0 60px rgba(0,0,0,0.35)',
      }}
    >
      <header style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--border-hairline)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            {ROTULO_DO_STATUS[arvore.raiz.status]}
          </p>
          <h2 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {arvore.raiz.objetivo}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--text-tertiary)' }}>
            {nomeDoAgente(arvore.raiz.agenteId)}
            {arvore.raiz.duracaoMs !== null && ` · ${duracaoLegivel(arvore.raiz.duracaoMs)}${raizTerminal ? '' : ` ${COPY_TAREFAS.duracaoAgora}`}`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={aoFechar}>{COPY_TAREFAS.fechar}</Button>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 22px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {linhas.map(({ no: n, nivel }) => {
            const travado = arvore.travadoEm === n.id
            const ativo = selecionado === n.id
            const terminal = ['done', 'failed', 'cancelled'].includes(n.status)
            return (
              <li key={n.id} style={{ paddingLeft: nivel * 16 }}>
                <button
                  type="button"
                  onClick={() => setSelecionado(n.id)}
                  aria-current={ativo ? 'true' : undefined}
                  style={{
                    width: '100%', textAlign: 'left', cursor: 'pointer',
                    background: ativo ? 'color-mix(in srgb, var(--wave-to) 10%, transparent)' : 'transparent',
                    border: '1px solid', borderColor: ativo ? 'color-mix(in srgb, var(--wave-to) 26%, transparent)' : 'transparent',
                    borderRadius: 'var(--radius-sm, 8px)', padding: '8px 10px',
                    display: 'flex', alignItems: 'baseline', gap: 10,
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.objetivo}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 11.5, color: corDoStatus(n.status) }}>
                    {ROTULO_DO_STATUS[n.status]}
                  </span>
                  {n.duracaoMs !== null && (
                    <span style={{ flexShrink: 0, fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                      {duracaoLegivel(n.duracaoMs)}{terminal ? '' : ` ${COPY_TAREFAS.duracaoAgora}`}
                    </span>
                  )}
                  {travado && (
                    <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: corDoStatus(n.status) }}>
                      {COPY_TAREFAS.travadoEm}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        {}
        <section aria-label="Linha do tempo">
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            {nomeDoAgente(no.agenteId)}
          </p>
          {no.linha.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{COPY_TAREFAS.semRastro}</p>
          ) : (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {no.linha.map((p, i) => (
                <li key={`${p.em}-${i}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span aria-hidden style={{ marginTop: 6, width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: corDoStatus(p.para) }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)' }}>
                      {ROTULO_DO_STATUS[p.para]}
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        {' '}· {horaLegivel(p.em)}
                        {p.desdeMs !== null ? ` · ${duracaoLegivel(p.desdeMs)}` : ''}
                      </span>
                    </p>
                    {p.motivo && (
                      <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{p.motivo}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {}
        {no.resultado && (
          <section aria-label={COPY_TAREFAS.resultadoTitulo}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              {COPY_TAREFAS.resultadoTitulo}
            </p>
            <div
              style={{
                margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)',
                overflowWrap: 'anywhere',
                maxHeight: 320, overflowY: 'auto',
                background: 'var(--surface-2, color-mix(in srgb, var(--text-primary) 4%, transparent))',
                border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm, 8px)',
                padding: '10px 12px',
              }}
            >
              <Markdown chat>{no.resultado.texto}</Markdown>
            </div>
            {no.resultado.truncado && (
              <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                {COPY_TAREFAS.resultadoTruncado}
              </p>
            )}
          </section>
        )}
      </div>

      {}
      <footer style={{ padding: '14px 22px', borderTop: '1px solid var(--border-hairline)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {no.aprovacaoId && (
          <a
            href="/aprovacoes"
            style={{ fontSize: 12.5, color: 'var(--wave-to)', textDecoration: 'none', fontWeight: 600 }}
          >
            {COPY_TAREFAS.verAprovacao}
          </a>
        )}
        <span style={{ flex: 1 }} />
        {aviso && <span style={{ fontSize: 12, color: 'var(--danger, #ff6b6b)' }}>{aviso}</span>}
        {ehDono && aoCancelar && !raizTerminal && (
          <Button
            variant="danger"
            size="sm"
            disabled={cancelando}
            title={COPY_TAREFAS.cancelarConfirma}
            onClick={cancelar}
          >
            {COPY_TAREFAS.cancelar}
          </Button>
        )}
      </footer>
    </aside>
  )
}
