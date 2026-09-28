'use client'



import { useState, useEffect } from 'react'
import type { ConfigController } from '../controller'
import { ResultLine, Badge, MonoBox } from '../ui'
import { SectionHeader } from '../SectionHeader'
import { ConnectionRow, type ConnState } from '../ConnectionRow'
import { desconfiancaDaChave, type ChaveEssencial } from '@/lib/config/desconfiancaDasChaves'
import { Collapsible } from '../Collapsible'
import { INPUT_STYLE, GHOST_BTN, LINK_STYLE, RepoPicker, AvisoSemEscrita, type RepoMode } from '../campos'
import { textoDoTesteOpenAi } from '@/lib/modelo/textoDoTeste'

export function EssenciaisSection({ ctrl, configured, embedded = false }: { ctrl: ConfigController; configured: boolean; embedded?: boolean }) {
  const [editing, setEditing] = useState({ openai: false, github: false, repo: false })
  
  const [repoMode, setRepoMode] = useState<RepoMode>(null)

  
  useEffect(() => {
    if (ctrl.saveMsg?.ok) { setEditing({ openai: false, github: false, repo: false }); setRepoMode(null) }
  }, [ctrl.saveMsg])



  
  
  
  
  
  
  const estado = (
    resultado: { ok: boolean; motivo?: string } | null | undefined,
    salvo: boolean | undefined,
  ): ConnState => {
    if (!resultado) return salvo ? 'connected' : 'off'
    if (resultado.ok) return salvo ? 'connected' : 'testada'
    return resultado.motivo ? 'conta' : 'warn'
  }

  
  
  
  
  
  const comSuspeita = (e: ConnState, resultado: unknown, chave: ChaveEssencial): ConnState =>
    desconfiancaDaChave({
      chave,
      motivoCerebro: ctrl.data?.cerebroMotivo,
      motivoModelo: ctrl.data?.modeloMotivo,
      testadaNestaSessao: Boolean(resultado),
      pareceConectada: e === 'connected',
    }) ?? e

  const openaiState = comSuspeita(
    estado(ctrl.openaiResult, ctrl.data?.status.openai_api_key), ctrl.openaiResult, 'openai_api_key',
  )
  const githubState = comSuspeita(
    estado(ctrl.githubTokenResult, ctrl.data?.status.github_token), ctrl.githubTokenResult, 'github_token',
  )
  const repoState = comSuspeita(
    estado(ctrl.githubResult, ctrl.data?.status.github_repo), ctrl.githubResult, 'github_repo',
  )

  
  
  
  const done = [openaiState, githubState, repoState].filter((e) => e === 'connected' || e === 'testada').length

  const dirty = Boolean(ctrl.openaiKey.trim() || ctrl.githubToken.trim() || ctrl.githubRepo.trim())

  
  
  const savedRepo = ctrl.data?.githubRepo ?? ''
  const effectiveRepo = (ctrl.githubRepo.trim() || savedRepo).trim()
  const webhookHooksUrl = effectiveRepo.includes('/')
    ? `https://github.com/${effectiveRepo}/settings/hooks/new`
    : null

  
  const openaiResultNode = ctrl.openaiResult ? (
    <ResultLine
      ok={ctrl.openaiResult.ok}
      text={textoDoTesteOpenAi(ctrl.openaiResult)}
    />
  ) : null
  const githubResultNode = ctrl.githubTokenResult ? (
    <ResultLine
      ok={ctrl.githubTokenResult.ok}
      text={ctrl.githubTokenResult.ok ? `conectado como ${ctrl.githubTokenResult.login ?? '?'}` : `falhou${ctrl.githubTokenResult.detail ? ` (${ctrl.githubTokenResult.detail})` : ''}`}
    />
  ) : null
  const repoResultNode = ctrl.githubResult ? (
    <ResultLine
      ok={ctrl.githubResult.ok}
      text={ctrl.githubResult.ok ? 'token e repositório válidos, conexão confirmada' : `falhou${ctrl.githubResult.detail ? ` (${ctrl.githubResult.detail})` : ''}`}
    />
  ) : null

  const wrapperStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 24 }
  const body = (
    <>
      <SectionHeader
        title="Chaves essenciais"
        description="As 3 conexões que ligam sua empresa. As já conectadas ficam recolhidas. Clique em Trocar só se quiser mudar."
        aside={
          <span
            style={{
              flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '4px 11px', borderRadius: 999,
              border: `1px solid ${done === 3 ? 'rgb(63 185 132 / 0.25)' : 'var(--border-hairline)'}`,
              fontSize: 12.5, color: done === 3 ? 'var(--approve)' : 'var(--text-tertiary)', whiteSpace: 'nowrap',
            }}
          >
            <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: done === 3 ? 'var(--approve)' : 'var(--text-tertiary)' }} />
            {done} de 3 {[openaiState, githubState, repoState].includes('testada') ? 'prontas' : 'conectadas'}
          </span>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {}
        <ConnectionRow
          index={1}
          title="OpenAI API Key"
          description="A chave que dá voz e raciocínio aos agentes."
          state={openaiState}
          configured={ctrl.data?.status.openai_api_key ?? false}
          editing={editing.openai}
          onEdit={() => setEditing((e) => ({ ...e, openai: true }))}
          onCancel={() => { ctrl.setOpenaiKey(''); setEditing((e) => ({ ...e, openai: false })) }}
          onTest={ctrl.testOpenai}
          testing={ctrl.testingOpenai}
          collapsedResult={openaiResultNode}
        >
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
          {openaiResultNode}
        </ConnectionRow>

        {}
        <ConnectionRow
          index={2}
          title="GitHub Token"
          description="Dá ao Cérebro acesso de leitura e escrita ao GitHub."
          state={githubState}
          configured={ctrl.data?.status.github_token ?? false}
          editing={editing.github}
          onEdit={() => setEditing((e) => ({ ...e, github: true }))}
          onCancel={() => { ctrl.setGithubToken(''); setEditing((e) => ({ ...e, github: false })) }}
          onTest={ctrl.testGithubToken}
          testing={ctrl.testingGithubToken}
          collapsedResult={githubResultNode}
        >
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
            Criar token no GitHub — escopo <code style={{ fontFamily: 'monospace' }}>repo</code> já preenchido ↗
          </a>
          {githubResultNode}
        </ConnectionRow>

        {}
        <ConnectionRow
          index={3}
          title="Repositório do Cérebro"
          description="Onde o Cérebro guarda e organiza as anotações da empresa."
          detail={!editing.repo && (ctrl.data?.status.github_repo ?? false) && savedRepo ? savedRepo : undefined}
          state={repoState}
          configured={ctrl.data?.status.github_repo ?? false}
          editing={editing.repo}
          onEdit={() => setEditing((e) => ({ ...e, repo: true }))}
          onCancel={() => { ctrl.setGithubRepo(''); setRepoMode(null); setEditing((e) => ({ ...e, repo: false })) }}
          onTest={ctrl.testGithub}
          testing={ctrl.testingGithub}
          collapsedResult={repoResultNode}
        >
          <RepoPicker ctrl={ctrl} mode={repoMode} onMode={setRepoMode} />

          {repoResultNode}
          <AvisoSemEscrita ctrl={ctrl} />
        </ConnectionRow>
      </div>

      {}
      {ctrl.data && (
        <Collapsible title="Aviso automático de mudanças" subtitle="Opcional, mantém o Cérebro atualizado na hora">
          <section
            style={{
              display: 'flex', flexDirection: 'column', gap: 16, padding: '18px 20px',
              background: 'var(--surface)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)',
            }}
          >
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
              Sempre que algo muda no seu repositório do GitHub, este aviso deixa o Cérebro
              atualizado na hora, em vez de esperar a sincronização automática. É opcional, mas recomendado.
            </p>

            {}
            <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              <li>
                Abra a página de avisos (webhooks) do seu repositório:
                {webhookHooksUrl ? (
                  <>
                    {' '}
                    <a href={webhookHooksUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--wave-from)', textDecoration: 'none', fontWeight: 500 }}>
                      abrir no GitHub ↗
                    </a>
                  </>
                ) : (
                  <span style={{ color: 'var(--text-tertiary)' }}> (conecte o repositório acima primeiro)</span>
                )}
              </li>
              <li>Cole o <strong style={{ color: 'var(--text-primary)' }}>endereço</strong> e o <strong style={{ color: 'var(--text-primary)' }}>código secreto</strong> abaixo nos campos do GitHub.</li>
              <li>No formato (<em>Content type</em>), escolha <strong style={{ color: 'var(--text-primary)' }}>application/json</strong> e ative o evento <strong style={{ color: 'var(--text-primary)' }}>Pull requests</strong>.</li>
            </ol>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                Endereço (Payload URL)
              </label>
              <MonoBox value={ctrl.data.webhookUrl} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                  Código secreto
                </label>
                <Badge ok={ctrl.data.status.webhook_secret} />
              </div>
              <MonoBox value={ctrl.data.webhookSecret} />
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                Gerado uma única vez e guardado com segurança. Não muda: trocar aqui quebraria a validação com o GitHub.
              </p>
            </div>
          </section>
        </Collapsible>
      )}

      {}
      {ctrl.saveMsg && (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            background: ctrl.saveMsg.ok ? 'rgb(63 185 132 / 0.08)' : 'rgb(229 99 77 / 0.08)',
            border: `1px solid ${ctrl.saveMsg.ok ? 'rgb(63 185 132 / 0.2)' : 'rgb(229 99 77 / 0.2)'}`,
            borderRadius: 'var(--radius-md)', fontSize: 13.5,
            color: ctrl.saveMsg.ok ? 'var(--approve)' : 'var(--reject)', lineHeight: 1.45,
          }}
        >
          {ctrl.saveMsg.text}
        </div>
      )}

      {}
      {!embedded && dirty && (
        <div
          style={{
            position: 'sticky', bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14,
            paddingTop: 16, paddingBottom: 18, marginTop: 2,
            background: 'linear-gradient(to top, var(--bg-base) 58%, transparent)',
          }}
        >
          <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>Você tem alterações não salvas.</span>
          <button
            type="submit"
            disabled={ctrl.saving}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 540, color: 'var(--bg-base)',
              background: 'var(--text-primary)', border: '1px solid transparent', borderRadius: 'var(--radius-md)',
              padding: '11px 26px', cursor: ctrl.saving ? 'not-allowed' : 'pointer', opacity: ctrl.saving ? 0.6 : 1,
            }}
          >
            {ctrl.saving ? 'Salvando...' : 'Salvar chaves'}
          </button>
        </div>
      )}
    </>
  )
  if (embedded) return <div style={wrapperStyle}>{body}</div>
  return <form onSubmit={(e) => { e.preventDefault(); void ctrl.save() }} style={wrapperStyle}>{body}</form>
}
