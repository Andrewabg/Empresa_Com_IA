'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  NAV_GROUPS, CONFIG_ITEM, filterNavGroups, filtrarGruposPorPapel, itemVisivelParaPapel,
  type NavItem, type HrefComIcone,
} from '@/lib/nav'
import type { Papel } from '@/lib/equipe'
import {
  CHAVE_RECOLHIDOS,
  alternarRecolhido,
  grupoAberto,
  gravarRecolhidos,
  lerRecolhidos,
  podeRecolher,
  rotuloDoBotao,
  seloVaiNoCabecalho,
} from '@/lib/nav-recolher'
import { Wave } from '@/components/wave/Wave'
import { useWave } from '@/components/wave/useWave'
import { bus } from '@/mock/bus'
import { MAKER_HANDLE, MAKER_URL } from '@/lib/brand'
import { DEFAULT_BRANDING } from '@/lib/branding'
import { useUpdateAvailable } from '@/app/config/useUpdateAvailable'
import { seloDeAprovacoes, type SeloDeAprovacoes } from '@/lib/aprovacoes/selo'
import { useAprovacoesPendentes } from './useAprovacoesPendentes'


function CommandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )
}

function ConversaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-3 2v-2H3a1 1 0 0 1-1-1V3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  )
}

function AgentesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M2.5 13c0-2 1.6-3.2 3.5-3.2S9.5 11 9.5 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="11.5" cy="5" r="1.6" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M10 12.6c0-1.5 1-2.4 2.2-2.4 1 0 1.8.6 2.1 1.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  )
}

function OrganogramaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="6" y="2" width="4" height="3" rx="0.8" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="2" y="11" width="3.5" height="3" rx="0.8" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="10.5" y="11" width="3.5" height="3" rx="0.8" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M8 5v3M8 8H3.75v3M8 8h4.25v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function LojaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2.5 7v6h11V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 6.8 3.1 3h9.8L14 6.8a1.5 1.5 0 0 1-2.9.5 1.5 1.5 0 0 1-2.9 0 1.5 1.5 0 0 1-2.9 0A1.5 1.5 0 0 1 2 6.8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M6.5 13V9.5h3V13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IntegracoesIcon() {
  
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M6.6 9.4a2.6 2.6 0 0 1 0-3.7l2-2a2.6 2.6 0 0 1 3.7 3.7l-1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.4 6.6a2.6 2.6 0 0 1 0 3.7l-2 2a2.6 2.6 0 0 1-3.7-3.7l1-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function InboxIcon() {
  
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 2.6c3.2 0 5.6 2.1 5.6 4.9S11.2 12.4 8 12.4c-.7 0-1.3-.1-1.9-.3l-2.9 1.3.9-2.4c-1-.9-1.7-2.1-1.7-3.5C2.4 4.7 4.8 2.6 8 2.6Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="5.6" cy="7.5" r="0.65" fill="currentColor" />
      <circle cx="8" cy="7.5" r="0.65" fill="currentColor" />
      <circle cx="10.4" cy="7.5" r="0.65" fill="currentColor" />
    </svg>
  )
}

function TreinoIcon() {
  
  
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2.6 3.4a1 1 0 0 1 1-1h8.8a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6.6l-2.7 2.2v-2.2H3.6a1 1 0 0 1-1-1V3.4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M5.7 6.3 7.2 7.8 10.3 4.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function RotinasIcon() {
  
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M13.4 8a5.4 5.4 0 1 1-1.6-3.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M13.6 2.6v2.6h-2.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 5.1V8l1.9 1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function TarefasIcon() {
  
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 3v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="4" cy="3.6" r="1.3" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="4" cy="12.4" r="1.3" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M7 5.2h5.5M7 8h4M7 10.8h5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function CerebroIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M8 2.5v2M8 11.5v2M2.5 8h2M11.5 8h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )
}

function TrafegoIcon() {
  
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2.5 13.3h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <rect x="3.3" y="9.2" width="2.3" height="4.1" rx="0.6" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="6.85" y="6.4" width="2.3" height="6.9" rx="0.6" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="10.4" y="3.6" width="2.3" height="9.7" rx="0.6" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )
}

function CopyIcon() {
  
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M11.8 2.6 13.4 4.2 6.5 11.1 4.2 11.8 4.9 9.5 11.8 2.6Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M2.5 13.6h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function DesignIcon() {
  
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.4" y="3.2" width="11.2" height="9.6" rx="1.4" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="5.8" cy="6.3" r="1.05" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M2.9 12.4 6.3 8.1 8.5 10.3 10.7 7.4 13.1 11.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function JuridicoIcon() {
  
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2.4v11M4.2 13.6h7.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M3.4 4.2h9.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M3.4 4.2 1.6 8.1h3.6L3.4 4.2ZM12.6 4.2 10.8 8.1h3.6L12.6 4.2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  )
}

function InstagramIcon() {
  
  
  
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2.6 3.4a1 1 0 0 1 1-1h8.8a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H8.4l-2.9 2.2v-2.2H3.6a1 1 0 0 1-1-1V3.4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M5.4 7.2h5.2M8.4 5 10.9 7.2 8.4 9.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function AprovacaoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ConfigIcon() {
  
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2.5 4.5h5.3M11.2 4.5h2.3M2.5 11.5h2.3M8.2 11.5h5.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="9.5" cy="4.5" r="1.7" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="6.5" cy="11.5" r="1.7" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )
}

function TelaCustomIcon() {
  
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.4" y="2.8" width="11.2" height="10.4" rx="1.4" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M2.4 5.8h11.2" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="4.5" cy="4.3" r="0.65" fill="currentColor"/>
    </svg>
  )
}

function TutoriaisIcon() {
  
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2.6 14.6 5.8 8 9 1.4 5.8 8 2.6Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M4.6 7v3c0 .9 1.5 1.9 3.4 1.9s3.4-1 3.4-1.9V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.6 5.8v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function AtalhoIcon() {
  
  
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M7 3.4H3.6a1 1 0 0 0-1 1v7.4a1 1 0 0 0 1 1H11a1 1 0 0 0 1-1V8.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.6 2.6H13v4.4M13 2.6 7.6 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function SairIcon() {
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M6.2 2.6H3.4a1 1 0 0 0-1 1v8.8a1 1 0 0 0 1 1h2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M10.2 5.2 13 8l-2.8 2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 8H6.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}


function SairLink() {
  const router = useRouter()
  const [saindo, setSaindo] = React.useState(false)
  async function sair() {
    if (saindo) return
    setSaindo(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      
      
    }
    
    
    router.replace('/login')
    router.refresh()
  }
  return (
    <li>
      <button
        type="button"
        onClick={() => void sair()}
        disabled={saindo}
        className="rail-link"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: '7px 11px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: 'none',
          textAlign: 'left',
          fontFamily: 'var(--font-ui)',
          fontSize: 13.5,
          fontWeight: 430,
          color: 'var(--text-tertiary)',
          cursor: saindo ? 'progress' : 'pointer',
        }}
      >
        <span className="rail-link__ico" aria-hidden style={{ display: 'inline-flex', color: 'var(--text-tertiary)', opacity: 0.85 }}>
          <SairIcon />
        </span>
        <span>{saindo ? 'Saindo…' : 'Sair'}</span>
      </button>
    </li>
  )
}

function EntregasIcon() {
  
  
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2.4 5.6h11.2v7.2a.9.9 0 0 1-.9.9H3.3a.9.9 0 0 1-.9-.9V5.6Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M1.8 3.3a.6.6 0 0 1 .6-.6h11.2a.6.6 0 0 1 .6.6v2.3H1.8V3.3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M8 2.7v11" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )
}




const ICON_MAP: Record<HrefComIcone, () => React.ReactElement> = {
  '/': CommandIcon,
  '/conversa': ConversaIcon,
  '/inbox': InboxIcon,
  '/treino': TreinoIcon,
  '/agentes': AgentesIcon,
  '/rotinas': RotinasIcon,
  '/loja': LojaIcon,
  '/integracoes': IntegracoesIcon,
  '/organograma': OrganogramaIcon,
  '/entregas': EntregasIcon,
  '/copy': CopyIcon,
  '/design': DesignIcon,
  '/trafego': TrafegoIcon,
  '/juridico': JuridicoIcon,
  '/instagram': InstagramIcon,
  '/cerebro': CerebroIcon,
  '/tarefas': TarefasIcon,
  '/aprovacoes': AprovacaoIcon,
  '/config': ConfigIcon,
}


function BrandMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id="awave-mark" x1="2" y1="12" x2="22" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--wave-from)" />
          <stop offset="1" stopColor="var(--wave-to)" />
        </linearGradient>
      </defs>
      <path
        d="M2 12.5 C 4 6.5, 6.5 6.5, 8.5 12.5 S 13 18.5, 15 12.5 S 19.5 7, 22 12.5"
        stroke="url(#awave-mark)"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

function SearchGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}


const WAVE_STATUS: Record<string, string> = {
  idle: 'Pronto',
  listening: 'Ouvindo',
  thinking: 'Pensando',
  acting: 'Agindo',
}


function NavLink({
  item,
  active,
  showDot,
  selo,
}: {
  item: NavItem
  active: boolean
  showDot?: boolean
  
  selo?: SeloDeAprovacoes
}) {
  
  
  const Icon = ICON_MAP[item.href as HrefComIcone] ?? (item.href.startsWith('/c/') ? TelaCustomIcon : undefined)
  return (
    <li>
      <Link
        href={item.href}
        className={active ? 'rail-link rail-link--active' : 'rail-link'}
        aria-current={active ? 'page' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: '7px 11px',
          borderRadius: 'var(--radius-sm)',
          textDecoration: 'none',
          fontSize: 13.5,
          fontWeight: active ? 540 : 430,
          color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
          
          
          
          background: active ? 'var(--surface-elevated)' : undefined,
          
          ...(showDot ? { position: 'relative' as const } : null),
        }}
      >
        {Icon && (
          <span
            className="rail-link__ico"
            aria-hidden
            style={{
              display: 'inline-flex',
              color: active ? 'var(--wave-from)' : 'var(--text-tertiary)',
              opacity: active ? 1 : 0.85,
            }}
          >
            <Icon />
          </span>
        )}
        <span>{item.label}</span>
        {}
        {selo?.visivel && (
          <span
            aria-label={selo.descricao}
            title={selo.descricao}
            style={{
              marginLeft: 'auto',
              flexShrink: 0,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              background: 'rgb(40 224 200 / 0.16)',
              border: '1px solid rgb(40 224 200 / 0.32)',
              color: 'var(--wave-from)',
              fontSize: 11,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {selo.texto}
          </span>
        )}
        {showDot && (
          <span
            aria-label="Atualização disponível"
            title="Atualização disponível"
            style={{
              position: 'absolute', top: 4, right: 6, width: 7, height: 7, borderRadius: 999,
              background: 'var(--wave-from)', animation: 'awave-live-dot 2.4s ease-in-out infinite',
            }}
          />
        )}
      </Link>
    </li>
  )
}





const TUTORIAIS_URL = 'https://elitedaia.com.br/guia'


function ExternalRailLink({ href, label, Icon }: { href: string; label: string; Icon: () => React.ReactElement }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="rail-link"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: '7px 11px',
          borderRadius: 'var(--radius-sm)',
          textDecoration: 'none',
          fontSize: 13.5,
          fontWeight: 430,
          color: 'var(--text-secondary)',
          
          
        }}
      >
        <span
          className="rail-link__ico"
          aria-hidden
          style={{ display: 'inline-flex', color: 'var(--text-tertiary)', opacity: 0.85 }}
        >
          <Icon />
        </span>
        <span>{label}</span>
      </a>
    </li>
  )
}


function AssistantCard({ assistantName }: { assistantName: string }) {
  const router = useRouter()
  const wave = useWave()
  const { pulse, setListening, setThinking } = wave

  useEffect(() => {
    
    const offLive = bus.on('live', (e) => {
      pulse({ id: e.id, t: performance.now() })
    })
    
    const offWave = bus.on('wave', (w) => {
      switch (w.kind) {
        case 'pulse':
          pulse({ id: w.id ?? `wave-${performance.now()}`, t: performance.now() })
          break
        case 'listening':
          setListening(w.amp ?? 0.6)
          break
        case 'thinking':
          setThinking(true)
          break
        case 'idle':
          setListening(0)
          setThinking(false)
          break
      }
    })
    return () => {
      offLive()
      offWave()
    }
  }, [pulse, setListening, setThinking])

  const status = WAVE_STATUS[wave.state] ?? 'Pronto'

  return (
    <button
      type="button"
      className="rail-assistant"
      onClick={() => router.push('/conversa')}
      aria-label={`Falar com o ${assistantName}`}
      title={`Falar com o ${assistantName} — abre a conversa`}
    >
      {}
      <span className="rail-assistant__head">
        <span
          aria-hidden
          className="rail-assistant__dot"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--wave-from)',
            animation: 'awave-live-dot 2.4s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.13em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          Assistente
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: 'var(--text-tertiary)',
            letterSpacing: '0.01em',
          }}
        >
          {status}
        </span>
      </span>

      {}
      <span style={{ display: 'block', width: '100%' }}>
        <Wave
          scale="micro"
          state={wave.state}
          amplitude={wave.amplitude}
          ripples={wave.ripples}
          aria-label="Onda — assistente"
        />
      </span>
    </button>
  )
}


const HREF_APROVACOES = '/aprovacoes'

interface RailProps {
  onOpenPalette: () => void
  
  aprovacoesPendentes?: number
  
  active?: ReadonlySet<string> | null
  
  customPages?: { href: string; titulo: string }[]
  
  branding?: { appName: string; logoUrl: string | null; assistantName: string }
  
  atalhosRail?: { nome: string; url: string }[]
  
  papel: Papel | null | undefined
}

export function Rail({ onOpenPalette, active, customPages, branding, atalhosRail, aprovacoesPendentes = 0, papel }: RailProps) {
  const pathname = usePathname()
  const configActive = pathname === CONFIG_ITEM.href
  const { updateAvailable } = useUpdateAvailable()
  const selo = seloDeAprovacoes(useAprovacoesPendentes(aprovacoesPendentes))
  const groups = filtrarGruposPorPapel(active ? filterNavGroups(NAV_GROUPS, active) : NAV_GROUPS, papel)
  
  
  
  
  const [recolhidos, setRecolhidos] = useState<ReadonlySet<string>>(() => new Set())
  useEffect(() => {
    try {
      setRecolhidos(lerRecolhidos(localStorage.getItem(CHAVE_RECOLHIDOS)))
    } catch {
      
    }
  }, [])
  const alternarSecao = useCallback((label: string) => {
    setRecolhidos((atual) => {
      const proximo = alternarRecolhido(atual, label)
      try {
        localStorage.setItem(CHAVE_RECOLHIDOS, gravarRecolhidos(proximo))
      } catch {
        
      }
      return proximo
    })
  }, [])
  const appName = branding?.appName ?? DEFAULT_BRANDING.appName
  const logoUrl = branding?.logoUrl ?? null
  const assistantName = branding?.assistantName ?? DEFAULT_BRANDING.assistantName

  return (
    <nav
      aria-label="Navegação principal"
      style={{
        width: 216,
        minWidth: 216,
        maxWidth: 216,
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0) 16%), var(--surface)',
        borderRight: '1px solid var(--border-hairline)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      {}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -80,
          left: -36,
          width: 250,
          height: 210,
          background:
            'radial-gradient(130px 110px at 64px 96px, rgba(40,224,200,0.10), transparent 72%), radial-gradient(150px 120px at 160px 56px, rgba(124,92,255,0.10), transparent 72%)',
          pointerEvents: 'none',
        }}
      />

      {}
      <div style={{ padding: '20px 14px 12px', position: 'relative' }}>
        <Link href="/" className="rail-logo" aria-label={`${appName} — início`}>
          <span
            className="rail-logo__mark"
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              display: 'grid',
              placeItems: 'center',
              background:
                'linear-gradient(145deg, rgba(40,224,200,0.16), rgba(124,92,255,0.16))',
              border: '1px solid rgb(255 255 255 / 0.08)',
              boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.06)',
              flexShrink: 0,
            }}
          >
            {logoUrl ? (
              
              
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" width={20} height={20} style={{ objectFit: 'contain' }} />
            ) : (
              <BrandMark />
            )}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18.5,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              lineHeight: 1,
              marginLeft: 11,
              userSelect: 'none',
            }}
          >
            {appName}
          </span>
        </Link>

        {}
        <button
          onClick={onOpenPalette}
          className="rail-search"
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)',
            background: 'rgb(255 255 255 / 0.025)',
            color: 'var(--text-tertiary)',
            fontSize: 12.5,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          <span className="rail-search__ico" style={{ display: 'inline-flex' }}>
            <SearchGlyph />
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>Buscar…</span>
          <kbd
            style={{
              marginLeft: 'auto',
              fontFamily: 'inherit',
              fontSize: 11,
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 4,
              padding: '1px 5px',
              color: 'var(--text-tertiary)',
            }}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      {}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '4px 0 8px',
        }}
      >
        {groups.map((group, gi) => {
          const aberto = grupoAberto(group, recolhidos, pathname)
          const recolhivel = podeRecolher(group)
          return (
            <div
              key={group.label ?? `grupo-${gi}`}
              style={{ padding: '0 10px', marginTop: gi === 0 ? 0 : 14 }}
            >
              {group.label &&
                (recolhivel ? (
                  <button
                    type="button"
                    onClick={() => alternarSecao(group.label as string)}
                    aria-expanded={aberto}
                    aria-label={rotuloDoBotao(group.label, aberto)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      width: '100%',
                      padding: '0 11px',
                      marginBottom: 6,
                      background: 'transparent',
                      border: 'none',
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--text-tertiary)',
                      fontFamily: 'var(--font-ui)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <svg
                      aria-hidden
                      width="8"
                      height="8"
                      viewBox="0 0 8 8"
                      style={{
                        flexShrink: 0,
                        transform: aberto ? 'rotate(90deg)' : 'none',
                        transition: 'transform 140ms ease',
                      }}
                    >
                      <path d="M2 1l4 3-4 3z" fill="currentColor" />
                    </svg>
                    {group.label}
                    {}
                    {!aberto &&
                      (seloVaiNoCabecalho(group, aberto, HREF_APROVACOES, selo.visivel) ? (
                        <span
                          aria-label={selo.descricao}
                          title={selo.descricao}
                          style={{
                            marginLeft: 'auto',
                            letterSpacing: 0,
                            minWidth: 16,
                            padding: '1px 5px',
                            borderRadius: 999,
                            background: 'var(--wave-to)',
                            color: '#0A0B0D',
                            fontSize: 9.5,
                            fontWeight: 700,
                            textAlign: 'center',
                          }}
                        >
                          {selo.texto}
                        </span>
                      ) : (
                        <span style={{ marginLeft: 'auto', letterSpacing: 0, opacity: 0.75 }}>
                          {group.items.length}
                        </span>
                      ))}
                  </button>
                ) : (
                  <div
                    style={{
                      padding: '0 11px',
                      marginBottom: 6,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {group.label}
                  </div>
                ))}
              {aberto && (
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={pathname === item.href}
                      selo={item.href === HREF_APROVACOES ? selo : undefined}
                    />
                  ))}
                </ul>
              )}
            </div>
          )
        })}

        {}
        {customPages && customPages.length > 0 && (
          <div style={{ padding: '0 10px', marginTop: 14 }}>
            <div
              style={{
                padding: '0 11px',
                marginBottom: 6,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              Suas telas
            </div>
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {customPages.map((p) => (
                <NavLink
                  key={p.href}
                  item={{ label: p.titulo, href: p.href, description: 'Tela personalizada da sua empresa' }}
                  active={pathname === p.href}
                />
              ))}
            </ul>
          </div>
        )}

        {}
        {atalhosRail && atalhosRail.length > 0 && (
          <div style={{ padding: '0 10px', marginTop: 14 }}>
            <div
              style={{
                padding: '0 11px',
                marginBottom: 6,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              Atalhos
            </div>
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {atalhosRail.map((a) => (
                <ExternalRailLink key={a.url + a.nome} href={a.url} label={a.nome} Icon={AtalhoIcon} />
              ))}
            </ul>
          </div>
        )}
      </div>

      {}
      <div
        style={{
          borderTop: '1px solid var(--border-hairline)',
          padding: '8px 12px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          position: 'relative',
        }}
      >
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ExternalRailLink href={TUTORIAIS_URL} label="Tutoriais" Icon={TutoriaisIcon} />
          {itemVisivelParaPapel(CONFIG_ITEM, papel) && (
            <NavLink item={CONFIG_ITEM} active={configActive} showDot={updateAvailable} />
          )}
          <SairLink />
        </ul>

        <AssistantCard assistantName={assistantName} />

        {}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            fontSize: 10.5,
            letterSpacing: '0.01em',
            color: 'var(--text-tertiary)',
            opacity: 0.85,
          }}
        >
          <span>feito por</span>
          <a
            href={MAKER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rail-credit__link"
          >
            {MAKER_HANDLE}
          </a>
        </div>
      </div>
    </nav>
  )
}
