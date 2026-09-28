'use client'



import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { SetupStep } from '@/components/ui/SetupStep'
import { ResultLine } from '@/app/config/ui'
import {
  INPUT_STYLE,
  GHOST_BTN,
  LINK_STYLE,
  RepoPicker,
  AvisoSemEscrita,
  type RepoMode,
} from '@/app/config/campos'
import { springPreset, useReducedMotion } from '@/lib/motion'
import type { ConfigController } from '@/app/config/controller'
import { textoDoTesteOpenAi } from '@/lib/modelo/textoDoTeste'

type ChaveId = 'openai' | 'github' | 'repo'

const ORDEM: ChaveId[] = ['openai', 'github', 'repo']

const ROTULO: Record<ChaveId, string> = {
  openai: 'OpenAI',
  github: 'GitHub',
  repo: 'Repositório',
}

export function KeysStep({
  ctrl,
  direction,
  onNext,
  onBack,
}: {
  ctrl: ConfigController
  direction: number
  onNext: () => void
  onBack: () => void
}) {
  const reduced = useReducedMotion() ?? false
  const [passo, setPasso] = useState(0)
  const [repoMode, setRepoMode] = useState<RepoMode>(null)
  
  const [sentido, setSentido] = useState(1)

  const atual = ORDEM[passo]!
  const ultimo = passo === ORDEM.length - 1

  const pronta: Record<ChaveId, boolean> = {
    openai: ctrl.validity.openai,
    github: ctrl.validity.githubToken,
    repo: ctrl.validity.repo,
  }

  const podeAvancar = pronta[atual] && !ctrl.saving

  const avancar = () => {
    if (!ultimo) {
      setSentido(1)
      setPasso((p) => p + 1)
      return
    }
    
    void ctrl.save().then((ok) => { if (ok) onNext() })
  }

  const voltar = () => {
    if (passo === 0) { onBack(); return }
    setSentido(-1)
    setPasso((p) => p - 1)
  }

  return (
    <SetupStep
      index=""
      kicker="As chaves da empresa"
      title="Conecte sua empresa"
      subtitle="Três conexões dão voz, raciocínio e memória aos agentes. É o único passo técnico, e a gente guia um de cada vez."
      direction={direction}
    >
      <Trilha passo={passo} pronta={pronta} />

      <div style={{ position: 'relative' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={atual}
            initial={reduced ? false : { opacity: 0, x: sentido >= 0 ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: sentido >= 0 ? -20 : 20 }}
            transition={reduced ? { duration: 0 } : springPreset}
          >
            <Cartao
              titulo={TITULO[atual]}
              descricao={DESCRICAO[atual]}
              pronta={pronta[atual]}
            >
              {atual === 'openai' && <CampoOpenAI ctrl={ctrl} />}
              {atual === 'github' && <CampoGithub ctrl={ctrl} />}
              {atual === 'repo' && (
                <>
                  <RepoPicker ctrl={ctrl} mode={repoMode} onMode={setRepoMode} mostrarDica={false} />
                  {ctrl.githubResult && (
                    <ResultLine
                      ok={ctrl.githubResult.ok}
                      text={ctrl.githubResult.ok ? 'token e repositório válidos, conexão confirmada' : `falhou${ctrl.githubResult.detail ? ` (${ctrl.githubResult.detail})` : ''}`}
                    />
                  )}
                  <AvisoSemEscrita ctrl={ctrl} />
                </>
              )}
            </Cartao>
          </motion.div>
        </AnimatePresence>
      </div>

      {ctrl.saveMsg && !ctrl.saveMsg.ok && (
        <div
          role="alert"
          style={{
            padding: '10px 14px', background: 'rgb(229 99 77 / 0.08)',
            border: '1px solid rgb(229 99 77 / 0.2)', borderRadius: 'var(--radius-md)',
            fontSize: 13.5, color: 'var(--reject)', lineHeight: 1.45,
          }}
        >
          {ctrl.saveMsg.text}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
        <button
          type="button"
          onClick={voltar}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', fontSize: 13.5, cursor: 'pointer', padding: '8px 4px' }}
        >
          ← Voltar
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {!pronta[atual] && (
            <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
              Teste a conexão para seguir
            </span>
          )}
          <button
            type="button"
            onClick={avancar}
            disabled={!podeAvancar}
            style={{
              position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
              background: 'var(--surface-elevated)', border: '1px solid transparent', borderRadius: 'var(--radius-md)',
              padding: '11px 22px', cursor: podeAvancar ? 'pointer' : 'default', opacity: podeAvancar ? 1 : 0.45,
              backgroundImage: 'linear-gradient(var(--surface-elevated), var(--surface-elevated)), linear-gradient(120deg, var(--wave-from), var(--wave-to))',
              backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box',
            }}
          >
            {ctrl.saving ? 'Salvando…' : ultimo ? 'Concluir' : 'Continuar'}
            <span aria-hidden style={{ opacity: 0.7 }}>→</span>
          </button>
        </div>
      </div>
    </SetupStep>
  )
}

const TITULO: Record<ChaveId, string> = {
  openai: 'OpenAI API Key',
  github: 'GitHub Token',
  repo: 'Repositório do Cérebro',
}

const DESCRICAO: Record<ChaveId, string> = {
  openai: 'A chave que dá voz e raciocínio aos agentes.',
  github: 'Dá ao Cérebro acesso de leitura e escrita ao GitHub.',
  repo: 'Onde o Cérebro guarda e organiza as anotações da empresa.',
}


function Trilha({ passo, pronta }: { passo: number; pronta: Record<ChaveId, boolean> }) {
  return (
    <ol
      aria-label="Progresso das conexões"
      style={{ display: 'flex', alignItems: 'center', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}
    >
      {ORDEM.map((id, i) => {
        const ativo = i === passo
        const feito = pronta[id]
        const cor = feito ? 'var(--approve)' : ativo ? 'var(--text-primary)' : 'var(--text-tertiary)'
        return (
          <li key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                fontSize: 12.5, color: cor, whiteSpace: 'nowrap',
                fontWeight: ativo ? 550 : 400,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 18, height: 18, borderRadius: 999, display: 'grid', placeItems: 'center',
                  fontSize: 10.5, fontWeight: 600,
                  color: feito ? 'var(--approve)' : cor,
                  border: `1px solid ${feito ? 'rgb(63 185 132 / 0.4)' : ativo ? 'var(--text-tertiary)' : 'var(--border-hairline)'}`,
                  background: ativo && !feito ? 'var(--surface-elevated)' : 'transparent',
                }}
              >
                {feito ? '✓' : i + 1}
              </span>
              {ROTULO[id]}
            </span>
            {i < ORDEM.length - 1 && (
              <span aria-hidden style={{ width: 22, height: 1, background: 'var(--border-hairline)', flexShrink: 0 }} />
            )}
          </li>
        )
      })}
    </ol>
  )
}


function Cartao({
  titulo,
  descricao,
  pronta,
  children,
}: {
  titulo: string
  descricao: string
  pronta: boolean
  children: React.ReactNode
}) {
  return (
    <section
      style={{
        display: 'flex', flexDirection: 'column', gap: 14,
        padding: '20px 22px',
        background: 'var(--surface)',
        border: `1px solid ${pronta ? 'rgb(63 185 132 / 0.25)' : 'var(--border-hairline)'}`,
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 16.5, fontWeight: 600, color: 'var(--text-primary)' }}>
            {titulo}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {descricao}
          </p>
        </div>
        <span
          style={{
            flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 11px', borderRadius: 999, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
            color: pronta ? 'var(--approve)' : 'var(--text-tertiary)',
            background: pronta ? 'rgb(63 185 132 / 0.12)' : 'rgb(255 255 255 / 0.04)',
            border: `1px solid ${pronta ? 'rgb(63 185 132 / 0.25)' : 'var(--border-hairline)'}`,
          }}
        >
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }} />
          {pronta ? 'Pronta' : 'Não conectado'}
        </span>
      </div>
      {children}
    </section>
  )
}

function CampoOpenAI({ ctrl }: { ctrl: ConfigController }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
        <input
          id="openai_api_key"
          name="openai_api_key"
          type="password"
          value={ctrl.openaiKey}
          onChange={(e) => ctrl.setOpenaiKey(e.target.value)}
          placeholder="sk-..."
          autoComplete="off"
          style={INPUT_STYLE}
        />
        <button type="button" onClick={ctrl.testOpenai} disabled={ctrl.testingOpenai} style={{ ...GHOST_BTN, opacity: ctrl.testingOpenai ? 0.6 : 1 }}>
          {ctrl.testingOpenai ? 'Testando...' : 'Testar'}
        </button>
      </div>
      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={LINK_STYLE}>
        Criar chave na OpenAI ↗
      </a>
      {ctrl.openaiResult && (
        <ResultLine
          ok={ctrl.openaiResult.ok}
          text={textoDoTesteOpenAi(ctrl.openaiResult)}
        />
      )}
    </>
  )
}

function CampoGithub({ ctrl }: { ctrl: ConfigController }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
        <input
          id="github_token"
          name="github_token"
          type="password"
          value={ctrl.githubToken}
          onChange={(e) => ctrl.setGithubToken(e.target.value)}
          placeholder="ghp_..."
          autoComplete="off"
          style={INPUT_STYLE}
        />
        <button type="button" onClick={ctrl.testGithubToken} disabled={ctrl.testingGithubToken} style={{ ...GHOST_BTN, opacity: ctrl.testingGithubToken ? 0.6 : 1 }}>
          {ctrl.testingGithubToken ? 'Testando...' : 'Testar'}
        </button>
      </div>
      <a href={ctrl.githubTokenUrl} target="_blank" rel="noopener noreferrer" style={LINK_STYLE}>
        Criar token no GitHub ↗
      </a>
      {ctrl.githubTokenResult && (
        <ResultLine
          ok={ctrl.githubTokenResult.ok}
          text={ctrl.githubTokenResult.ok ? `conectado como ${ctrl.githubTokenResult.login ?? '?'}` : `falhou${ctrl.githubTokenResult.detail ? ` (${ctrl.githubTokenResult.detail})` : ''}`}
        />
      )}
    </>
  )
}
