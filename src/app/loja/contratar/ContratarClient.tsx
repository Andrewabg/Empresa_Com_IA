'use client'



import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useReducedMotion } from '@/lib/motion'
import { Wave } from '@/components/wave/Wave'
import { useWave } from '@/components/wave/useWave'
import { AgentWaveAvatar } from '@/components/avatar/AgentWaveAvatar'
import { SecondaryTranscript } from '../../conversa/ConversaClient'
import type { ChatMessage } from '../../conversa/useChatStream'
import { useHiringStream } from './useHiringStream'
import { ToolkitCard } from './ToolkitCard'
import { CandidatoCard } from './CandidatoCard'
import type { ToolkitCardData, CandidatoCardData } from '@/server/agent/wireTypes'


export interface SessaoInicial {
  id: string
  transcript: { role: 'user' | 'assistant'; content: string; at: string }[]
  toolkits: ToolkitCardData[]
  candidato: CandidatoCardData | null
}

interface ContratarClientProps {
  
  sessao: SessaoInicial | null
  
  sessaoVelha: boolean
  
  revisao?: { agentId: string; nome: string; papel: string } | null
}

export function ContratarClient({ sessao, sessaoVelha, revisao }: ContratarClientProps) {
  const emRevisao = revisao != null
  const router = useRouter()
  const reducedMotion = useReducedMotion() ?? false
  const wave = useWave()

  const onNeedsConfig = useCallback(() => router.push('/config'), [router])
  const hiring = useHiringStream({
    initialSessionId: sessao?.id ?? null,
    initialMessages: (sessao?.transcript ?? []).map(
      (m, i): ChatMessage => ({ id: `t-${i}`, role: m.role, content: m.content, created_at: m.at }),
    ),
    initialToolkits: sessao?.toolkits ?? [],
    initialCandidato: sessao?.candidato ?? null,
    revisaoAgentId: revisao?.agentId ?? null,
    onNeedsConfig,
  })
  const { kickoff, recomecar: hiringRecomecar, send: hiringSend, decidirFerramenta, marcarConectada } = hiring

  
  const [gateVelha, setGateVelha] = useState(sessaoVelha)
  
  const [bannerRetomada, setBannerRetomada] = useState(
    () => sessao !== null && sessao.transcript.length > 0,
  )

  
  
  
  
  
  
  const kickoffFiredRef = useRef(false)
  useEffect(() => {
    if (sessao || sessaoVelha || kickoffFiredRef.current) return
    const t = setTimeout(() => {
      kickoffFiredRef.current = true
      kickoff()
    }, 0)
    return () => clearTimeout(t)
  }, [sessao, sessaoVelha, kickoff])

  const recomecar = useCallback(() => {
    setGateVelha(false)
    setBannerRetomada(false)
    hiringRecomecar()
  }, [hiringRecomecar])

  
  const [draft, setDraft] = useState('')
  const inputId = useId()
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const streaming = hiring.status === 'streaming'

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), 120)}px`
    el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden'
  }, [draft])

  const onSend = useCallback(() => {
    const text = draft.trim()
    if (!text || streaming) return
    hiringSend(text)
    setDraft('')
    setBannerRetomada(false)
  }, [draft, streaming, hiringSend])

  
  const lastContent = hiring.messages.length
    ? hiring.messages[hiring.messages.length - 1].content
    : ''
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const raf = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [hiring.messages.length, lastContent, reducedMotion])

  const focarComposer = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const podeEnviar = draft.trim().length > 0 && !streaming

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {}
      <header
        style={{
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          borderBottom: '1px solid var(--border-hairline)',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            opacity: 0.35,
            pointerEvents: 'none',
          }}
        >
          <Wave
            scale="hero"
            state={wave.state}
            amplitude={wave.amplitude}
            ripples={wave.ripples}
            aria-label="Onda da Awave"
          />
        </div>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse 75% 70% at 50% 45%, transparent 30%, var(--bg-base) 100%)',
          }}
        />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: 'clamp(16px, 2.5vh, 26px) clamp(18px, 3vw, 30px)',
            maxWidth: 1080,
            margin: '0 auto',
          }}
        >
          <AgentWaveAvatar agentId="rh" size={48} lit />
          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              {emRevisao ? 'Loja · Ajustar agente' : 'Loja · Sob medida'}
            </p>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(19px, 2.2vw, 24px)',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
              }}
            >
              {emRevisao ? `Revisão — ${revisao.papel}` : 'Entrevista de contratação'}
            </h1>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              {emRevisao
                ? `Diga o que quer mudar — o RH regenera o ${revisao.papel} e mostra o antes e o depois.`
                : 'Descreva o que você precisa — o RH entrevista, conecta suas ferramentas e apresenta o candidato pronto.'}
            </p>
          </div>
          <Link
            href={emRevisao ? `/agente/${encodeURIComponent(revisao.agentId)}` : '/loja'}
            style={{
              flexShrink: 0,
              padding: '7px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--surface)',
              fontSize: 12.5,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {emRevisao ? '← Estação' : '← Loja'}
          </Link>
        </div>
      </header>

      {}
      {gateVelha ? (
        
        <div style={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center', padding: 24 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
              maxWidth: 440,
              textAlign: 'center',
              padding: 'clamp(24px, 4vw, 40px)',
              background: 'var(--surface)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div aria-hidden style={{ opacity: 0.5 }}>
              <Wave scale="inline" state="idle" amplitude={0} ripples={[]} aria-label="Onda" />
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              Sua última entrevista ficou pra trás
            </p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
              Faz mais de um dia que ela parou. O melhor caminho é recomeçar do zero — leva poucos
              minutos.
            </p>
            <button
              type="button"
              onClick={recomecar}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: 13.5,
                fontWeight: 600,
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
              }}
            >
              Começar nova entrevista
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: 1080,
            margin: '0 auto',
          }}
        >
          {}
          {bannerRetomada && (
            <div
              role="status"
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                margin: 'clamp(10px, 1.5vh, 16px) clamp(14px, 2.5vw, 20px) 0',
                padding: '10px 14px',
                background: 'var(--surface)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span style={{ flex: 1, minWidth: 200, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                {emRevisao
                  ? 'Você tem uma revisão em andamento — continuar de onde parou?'
                  : 'Você tem uma entrevista em andamento — continuar de onde parou?'}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setBannerRetomada(false)
                    focarComposer()
                  }}
                  style={{
                    padding: '6px 13px',
                    borderRadius: 99,
                    border: '1px solid var(--border-hairline)',
                    background: 'var(--surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                  }}
                >
                  Continuar
                </button>
                {}
                {!emRevisao && (
                  <button
                    type="button"
                    onClick={recomecar}
                    style={{
                      padding: '6px 13px',
                      borderRadius: 99,
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-tertiary)',
                      fontSize: 12,
                      fontFamily: 'var(--font-ui)',
                      cursor: 'pointer',
                    }}
                  >
                    Recomeçar
                  </button>
                )}
              </div>
            </div>
          )}

          {}
          <SecondaryTranscript
            ref={scrollRef}
            messages={hiring.messages}
            streamingId={hiring.streamingId}
            isEmpty={false}
            error={hiring.error}
            reducedMotion={reducedMotion}
            agentName="RH"
          />

          {}
          {(hiring.toolkits.length > 0 || hiring.candidato) && (
            <div
              className="awave-scroll-fantasma"
              style={{
                flexShrink: 0,
                maxHeight: '46vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: '10px clamp(14px, 2.5vw, 20px) 0',
              }}
            >
              {hiring.toolkits.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {hiring.toolkits.map((tk) => (
                    <ToolkitCard
                      key={tk.slug}
                      data={tk}
                      bloqueado={streaming}
                      decidir={decidirFerramenta}
                      onConectada={marcarConectada}
                    />
                  ))}
                </div>
              )}
              {hiring.candidato && (
                <CandidatoCard
                  candidato={hiring.candidato}
                  sessionId={hiring.sessionId}
                  bloqueado={streaming}
                  onPedirAjustes={focarComposer}
                />
              )}
            </div>
          )}

          {}
          <div
            style={{
              flexShrink: 0,
              padding:
                'clamp(10px, 1.6vh, 16px) clamp(14px, 2.5vw, 20px) clamp(14px, 2.5vh, 20px)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                background: 'var(--surface)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '8px 8px 8px 14px',
              }}
            >
              <label htmlFor={inputId} style={SR_ONLY}>
                Mensagem para o RH
              </label>
              <textarea
                id={inputId}
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onSend()
                  }
                }}
                rows={1}
                placeholder="Descreva o que você precisa…"
                style={{
                  flex: 1,
                  resize: 'none',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 14.5,
                  lineHeight: 1.5,
                  minHeight: 44,
                  maxHeight: 120,
                  padding: '10px 0',
                  boxSizing: 'border-box',
                  overflowY: 'hidden',
                }}
              />
              <button
                type="button"
                onClick={onSend}
                disabled={!podeEnviar}
                aria-label="Enviar mensagem"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-hairline)',
                  background: podeEnviar ? 'var(--text-primary)' : 'var(--surface-elevated)',
                  color: podeEnviar ? 'var(--bg-base)' : 'var(--text-tertiary)',
                  cursor: podeEnviar ? 'pointer' : 'default',
                  transition: 'background 120ms ease, color 120ms ease',
                }}
              >
                <SendGlyph />
              </button>
            </div>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 11.5,
                color: 'var(--text-tertiary)',
                textAlign: 'center',
              }}
            >
              {emRevisao
                ? 'Enter para enviar · as mudanças só valem quando você aprovar o novo perfil'
                : 'Enter para enviar · o agente só nasce quando você aprovar o candidato'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}



function SendGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 8h9M7.5 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
}
