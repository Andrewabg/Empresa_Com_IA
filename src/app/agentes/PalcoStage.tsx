'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { bus } from '@/mock/bus'
import { canonicalSlug } from '@/lib/brain-nav'
import { useReducedMotion } from '@/lib/motion'
import { AgentWaveAvatar } from '@/components/avatar/AgentWaveAvatar'
import { AgentWaveOrb } from '@/components/avatar/AgentWaveOrb'
import { arcPositions } from '@/lib/avatar/ensembleArc'
import { vozInfo } from '@/lib/voicePalette'
import type { Agent, DesligadoUI, SaveState } from './types'
import { Toggle } from './parts'
import { AVISO_SO_O_DONO_DESLIGA } from '@/lib/agentes/somenteDono'


export function PalcoStage({
  agents, selected, selectedId, onSelect, tagline, conversarHref, estacaoHref, feriasSave, onFerias, isCanal, treinoHref,
  desligados, desligamentoSave, onDesligar, onReadmitir, isDono,
}: {
  agents: Agent[]
  selected: Agent | null
  selectedId: string | null
  onSelect: (id: string) => void
  tagline: string | null
  conversarHref: string | null
  estacaoHref: string | null
  feriasSave: SaveState
  onFerias: (v: boolean) => void
  
  isCanal: boolean
  
  treinoHref: string | null
  
  desligados: DesligadoUI[]
  desligamentoSave: SaveState
  onDesligar: () => void
  onReadmitir: (id: string) => void
  
  isDono: boolean
}) {
  const reduced = useReducedMotion()

  
  
  
  const ensemble = useMemo(() => agents.filter((a) => a.enabled && a.id !== selectedId), [agents, selectedId])
  const ferias = useMemo(() => agents.filter((a) => !a.enabled && a.id !== selectedId), [agents, selectedId])
  const positions = useMemo(() => arcPositions(ensemble.length), [ensemble.length])
  const [feriasOpen, setFeriasOpen] = useState(false)
  const [desligadosOpen, setDesligadosOpen] = useState(false)
  
  
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)
  useEffect(() => { setConfirmandoSaida(false) }, [selectedId])

  
  const [pulsing, setPulsing] = useState<Set<string>>(new Set())
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  useEffect(() => {
    const off = bus.on('live', (e) => {
      const slug = e.agent ? canonicalSlug(e.agent) : null
      if (!slug) return
      const match = agents.find((a) => canonicalSlug(a.id) === slug)
      if (!match) return
      setPulsing((prev) => new Set(prev).add(match.id))
      const existing = timersRef.current.get(match.id)
      if (existing !== undefined) clearTimeout(existing)
      const timer = setTimeout(() => {
        setPulsing((prev) => { const next = new Set(prev); next.delete(match.id); return next })
        timersRef.current.delete(match.id)
      }, 1000)
      timersRef.current.set(match.id, timer)
    })
    return () => {
      off()
      for (const t of timersRef.current.values()) clearTimeout(t)
      timersRef.current.clear()
    }
  }, [agents])

  return (
    <div className="palco-cena">
      {}
      <div className="palco-chao" aria-hidden />
      {}
      <div className="palco-holofote" aria-hidden />

      {}
      <div className="palco-elenco" aria-label="Seu time">
        {ensemble.map((a, i) => {
          const p = positions[i]
          if (!p) return null
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              aria-label={`Colocar ${a.name} no palco`}
              className="palco-elenco-item"
              style={{
                left: `${(p.xPct * 100).toFixed(2)}%`,
                top: `${(p.yPct * 100).toFixed(2)}%`,
                
                ['--elenco-scale' as string]: p.scale.toFixed(3),
                opacity: p.opacity.toFixed(2),
              }}
            >
              <AgentWaveAvatar agentId={a.id} size={64} lit={a.enabled} active={pulsing.has(a.id)} />
              <span className="palco-elenco-nome">{a.name}</span>
            </button>
          )
        })}
      </div>

      {}
      {ferias.length > 0 && (
        <div className="palco-ferias">
          {feriasOpen && (
            <div className="palco-ferias-lista" role="menu">
              {ferias.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="menuitem"
                  className="palco-ferias-item"
                  onClick={() => { onSelect(a.id); setFeriasOpen(false) }}
                >
                  <AgentWaveAvatar agentId={a.id} size={32} lit={false} />
                  <span className="palco-ferias-item-nome">{a.name}</span>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="palco-ferias-chip"
            onClick={() => setFeriasOpen((o) => !o)}
            aria-expanded={feriasOpen}
          >
            <span aria-hidden>☾</span> {ferias.length} de férias
          </button>
        </div>
      )}

      {}
      {desligados.length > 0 && (
        <div className="palco-desligados">
          {desligadosOpen && (
            <div className="palco-ferias-lista" role="menu">
              {desligados.map((d) => (
                <div key={d.id} className="palco-desligado-item">
                  <span className="palco-ferias-item-nome" title={d.role}>{d.name}</span>
                  {isDono && (
                    <button
                      type="button"
                      className="palco-desligado-voltar"
                      onClick={() => onReadmitir(d.id)}
                      disabled={desligamentoSave.kind === 'saving'}
                    >
                      Trazer de volta
                    </button>
                  )}
                </div>
              ))}
              {!isDono && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>{AVISO_SO_O_DONO_DESLIGA}</p>
              )}
            </div>
          )}
          <button
            type="button"
            className="palco-ferias-chip"
            onClick={() => setDesligadosOpen((o) => !o)}
            aria-expanded={desligadosOpen}
          >
            <span aria-hidden>✕</span> {desligados.length} desligado{desligados.length > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {}
      <div className="palco-heroi-anchor">
      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div
            key={selected.id}
            className="palco-heroi"
            initial={reduced ? false : { opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <AgentWaveOrb agentId={selected.id} size={216} lit={selected.enabled} />
            <div className="palco-heroi-id">
              <div className="palco-heroi-nome">{selected.name}</div>
              <div className="palco-heroi-cargo">{selected.role}</div>
              {tagline && <p className="palco-heroi-tag">&ldquo;{tagline}&rdquo;</p>}
              {}
              {}
              {selected.voice && !selected.voz_desligada && (
                <div className="palco-heroi-voz">
                  <span aria-hidden>∿</span> Voz: {vozInfo(selected.voice)?.label ?? selected.voice}
                  {vozInfo(selected.voice) && ` · ${vozInfo(selected.voice)!.timbre}`}
                </div>
              )}
              {selected.voz_desligada && <div className="palco-heroi-voz">Só por texto</div>}
            </div>
            <div className="palco-heroi-acoes">
              {conversarHref && (
                <Link href={conversarHref} className="palco-btn-conversar">Conversar →</Link>
              )}
              {estacaoHref && (
                <Link href={estacaoHref} className="palco-btn-estacao">Estação de trabalho</Link>
              )}
              <div
                title={
                  isCanal
                    ? 'Atendente de canal: ligue ou desligue pelo Treino.'
                    : 'Desligado, ele entra de férias: não responde nem trabalha. Nada se perde.'
                }
                style={{ minWidth: 108 }}
              >
                <Toggle id="palco-ativo" label="ativo" checked={selected.enabled} onChange={onFerias} disabled={isCanal || feriasSave.kind === 'saving'} />
              </div>
              {}
              {!selected.is_primary && isDono && (
                confirmandoSaida ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      className="palco-btn-desligar palco-btn-desligar-confirma"
                      onClick={() => { setConfirmandoSaida(false); onDesligar() }}
                      disabled={desligamentoSave.kind === 'saving'}
                    >
                      Confirmar saída
                    </button>
                    <button
                      type="button"
                      className="palco-btn-desligar"
                      onClick={() => setConfirmandoSaida(false)}
                    >
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="palco-btn-desligar"
                    title="Tira do time: sai do organograma e o cargo volta a ficar livre na Loja. O histórico fica, e dá pra trazer de volta."
                    onClick={() => setConfirmandoSaida(true)}
                    disabled={desligamentoSave.kind === 'saving'}
                  >
                    Desligar do time
                  </button>
                )
              )}
            </div>
            {confirmandoSaida && (
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)', maxWidth: 420, textAlign: 'center' }}>
                {selected.name} sai do organograma e da equipe, e o cargo volta a ficar livre na Loja.
                O trabalho já feito continua no histórico, e você pode trazer de volta quando quiser.
              </p>
            )}
            {desligamentoSave.kind === 'error' && (
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)' }}>{desligamentoSave.text}</p>
            )}
            {isCanal && treinoHref && (
              <Link href={treinoHref} style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none' }}>
                Editar e testar no Treino →
              </Link>
            )}
            {!isCanal && feriasSave.kind === 'error' && (
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)' }}>{feriasSave.text}</p>
            )}
          </motion.div>
        ) : (
          <div className="palco-heroi" style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
            Selecione alguém do time.
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}
