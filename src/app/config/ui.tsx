'use client'



import { useState } from 'react'
import type { MotivoFalhaModelo } from '@/lib/modelo/falhaDoModelo'



export interface ConfigStatus {
  openai_api_key: boolean
  github_token: boolean
  github_repo: boolean
  webhook_secret: boolean
  composio_api_key: boolean
}

export interface ConfigData {
  status: ConfigStatus
  webhookUrl: string
  webhookSecret: string
  
  githubRepo?: string | null
  
  isDono?: boolean
  
  companyName?: string
  
  cerebroMotivo?: string | null
  
  modeloMotivo?: string | null
  
  assistantName?: string
}

export interface OpenAiResult {
  ok: boolean
  detail?: string
  
  motivo?: MotivoFalhaModelo
}

export interface GithubResult {
  ok: boolean
  canWrite?: boolean
  detail?: string
}

export interface GithubTokenResult {
  ok: boolean
  login?: string
  detail?: string
}

export interface ComposioResult {
  ok: boolean
  error?: string
}

export interface TestResponse {
  openai: OpenAiResult | null
  github: GithubResult | null
  githubToken: GithubTokenResult | null
  composio: ComposioResult | null
}

export interface RepoEntry {
  fullName: string
  private: boolean
}

export interface ListReposResponse {
  ok: boolean
  repos?: RepoEntry[]
  detail?: string
}

export interface CreateRepoResponse {
  ok: boolean
  fullName?: string
  detail?: string
}

export type Validity = 'unknown' | 'valid' | 'invalid'



export function Badge({ ok }: { ok: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.04em',
        background: ok ? 'rgb(63 185 132 / 0.12)' : 'rgb(255 255 255 / 0.05)',
        color: ok ? 'var(--approve)' : 'var(--text-tertiary)',
        border: `1px solid ${ok ? 'rgb(63 185 132 / 0.2)' : 'rgb(255 255 255 / 0.07)'}`,
      }}
    >
      {ok ? '✓ configurado' : 'não configurado'}
    </span>
  )
}


export function ValidityBadge({ state }: { state: Validity }) {
  if (state === 'unknown') return null
  const ok = state === 'valid'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.04em',
        background: ok ? 'rgb(63 185 132 / 0.12)' : 'rgb(229 99 77 / 0.1)',
        color: ok ? 'var(--approve)' : 'var(--reject)',
        border: `1px solid ${ok ? 'rgb(63 185 132 / 0.2)' : 'rgb(229 99 77 / 0.22)'}`,
      }}
    >
      {ok ? 'válida ✓' : 'inválida ✗'}
    </span>
  )
}


export function TestButton({
  onClick,
  testing,
}: {
  onClick: () => void
  testing: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={testing}
      style={{
        padding: '8px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface-elevated)',
        color: 'var(--text-secondary)',
        fontSize: 13,
        fontFamily: 'var(--font-ui)',
        cursor: testing ? 'not-allowed' : 'pointer',
        opacity: testing ? 0.6 : 1,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {testing ? 'Testando...' : 'Testar'}
    </button>
  )
}


export function ResultLine({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p
      role="status"
      style={{
        margin: '2px 0 0',
        fontSize: 12.5,
        lineHeight: 1.45,
        color: ok ? 'var(--approve)' : 'var(--reject)',
      }}
    >
      {ok ? '✓ ' : '✗ '}
      {text}
    </p>
  )
}


export function Microcopy({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: '-1px 0 0',
        fontSize: 12.5,
        lineHeight: 1.5,
        color: 'var(--text-tertiary)',
      }}
    >
      {children}
    </p>
  )
}

export function Field({
  id,
  label,
  placeholder,
  value,
  onChange,
  configured,
  type = 'text',
  microcopy,
  validity = 'unknown',
  action,
  helper,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  configured: boolean
  type?: string
  microcopy?: React.ReactNode
  validity?: Validity
  action?: React.ReactNode
  helper?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <label
          htmlFor={id}
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          {label}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ValidityBadge state={validity} />
          <Badge ok={configured} />
        </div>
      </div>
      {microcopy && <Microcopy>{microcopy}</Microcopy>}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={configured ? '••••••••••••••••  (deixe em branco para manter)' : placeholder}
          autoComplete="off"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            padding: '11px 14px',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            outline: 'none',
            width: '100%',
          }}
        />
        {action}
      </div>
      {helper}
    </div>
  )
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        padding: '4px 10px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-hairline)',
        background: copied ? 'rgb(63 185 132 / 0.12)' : 'var(--surface-elevated)',
        color: copied ? 'var(--approve)' : 'var(--text-secondary)',
        fontSize: 12,
        fontFamily: 'var(--font-ui)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'color 0.15s, background 0.15s',
      }}
    >
      {copied ? 'copiado!' : 'copiar'}
    </button>
  )
}

export function MonoBox({ value }: { value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-md)',
        padding: '9px 12px',
      }}
    >
      <code
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: 'monospace',
          fontSize: 13,
          color: 'var(--text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </code>
      <CopyButton text={value} />
    </div>
  )
}
