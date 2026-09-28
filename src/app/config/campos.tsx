'use client'



import type { ConfigController } from './controller'
import { ResultLine } from './ui'

export const INPUT_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-md)',
  padding: '11px 14px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-ui)',
  fontSize: 14,
  outline: 'none',
}

export const GHOST_BTN: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-hairline)',
  background: 'var(--surface-elevated)',
  color: 'var(--text-secondary)',
  fontSize: 13,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
}

export const LINK_STYLE: React.CSSProperties = {
  fontSize: 12.5,
  color: 'var(--wave-from)',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
}

const VOLTAR_BTN: React.CSSProperties = {
  alignSelf: 'flex-start',
  background: 'transparent',
  border: 'none',
  padding: 0,
  color: 'var(--text-tertiary)',
  fontFamily: 'var(--font-ui)',
  fontSize: 12.5,
  cursor: 'pointer',
}

export type RepoMode = 'create' | 'existing' | null


export function RepoPicker({
  ctrl,
  mode,
  onMode,
  mostrarDica = true,
}: {
  ctrl: ConfigController
  mode: RepoMode
  onMode: (m: RepoMode) => void
  
  mostrarDica?: boolean
}) {
  const criarBloqueado =
    !ctrl.tokenAvailable || ctrl.creatingRepo || ctrl.newRepoName.trim().length === 0

  return (
    <>
      {mostrarDica && (
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          O sistema usa o seu token do GitHub. Você só escolhe, e ele lista ou cria pra você,
          sem digitar nada à mão.
        </p>
      )}

      {}
      {mode === null && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => onMode('create')} className="config-choice">
            <span aria-hidden style={{ color: 'var(--wave-from)', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="2.5" width="15" height="15" rx="4" stroke="currentColor" strokeWidth="1.2" /><path d="M10 6v8M6 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Criar do zero</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Um repositório privado, já pronto</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => { onMode('existing'); if (!ctrl.repoList) ctrl.listRepos() }}
            className="config-choice"
          >
            <span aria-hidden style={{ color: 'var(--wave-from)', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h3l1.6 1.8H16A1.5 1.5 0 0 1 17.5 7.3V14A1.5 1.5 0 0 1 16 15.5H4A1.5 1.5 0 0 1 2.5 14V5.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Usar um existente</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Escolher dos meus repositórios</span>
            </span>
          </button>
        </div>
      )}

      {}
      {mode === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" onClick={() => onMode(null)} style={VOLTAR_BTN}>← trocar opção</button>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, flexWrap: 'wrap' }}>
            <input
              id="new_repo_name"
              name="new_repo_name"
              type="text"
              value={ctrl.newRepoName}
              onChange={(e) => ctrl.setNewRepoName(e.target.value)}
              placeholder="awave-cerebro"
              autoComplete="off"
              aria-label="Nome do novo repositório"
              style={{ ...INPUT_STYLE, minWidth: 160, fontSize: 13.5, padding: '9px 12px' }}
            />
            <button
              type="button"
              onClick={ctrl.createRepo}
              disabled={criarBloqueado}
              title={ctrl.tokenAvailable ? undefined : 'conecte o token do GitHub primeiro'}
              style={{ ...GHOST_BTN, cursor: criarBloqueado ? 'not-allowed' : 'pointer', opacity: criarBloqueado ? 0.5 : 1 }}
            >
              {ctrl.creatingRepo ? 'Criando...' : 'Criar privado'}
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.45 }}>
            Criamos um repositório <strong style={{ color: 'var(--text-secondary)' }}>privado</strong> só seu, já inicializado para o Cérebro.
          </p>
          {ctrl.createResult && (
            <ResultLine
              ok={ctrl.createResult.ok}
              text={ctrl.createResult.ok ? 'repositório privado criado e selecionado ✓' : `não foi possível criar${ctrl.createResult.detail ? ` (${ctrl.createResult.detail})` : ''}`}
            />
          )}
        </div>
      )}

      {}
      {mode === 'existing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" onClick={() => onMode(null)} style={VOLTAR_BTN}>← trocar opção</button>
          {ctrl.repoList && ctrl.repoList.length > 0 ? (
            
            
            
            
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
              <select
                aria-label="Escolher repositório"
                value={ctrl.repoList.some((r) => r.fullName === ctrl.githubRepo) ? ctrl.githubRepo : ''}
                onChange={(e) => { if (e.target.value) ctrl.setGithubRepo(e.target.value) }}
                style={{
                  flex: 1, minWidth: 0,
                  background: 'var(--surface-elevated)', border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)', padding: '11px 14px', color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)', fontSize: 14, outline: 'none', cursor: 'pointer',
                }}
              >
                <option value="">Selecione um dos seus repositórios ({ctrl.repoList.length})…</option>
                {ctrl.repoList.map((r) => (
                  <option key={r.fullName} value={r.fullName}>{r.private ? '🔒 ' : ''}{r.fullName}</option>
                ))}
              </select>
              {ctrl.githubRepo.trim() && (
                <button type="button" onClick={ctrl.testGithub} disabled={ctrl.testingGithub} style={{ ...GHOST_BTN, opacity: ctrl.testingGithub ? 0.6 : 1 }}>
                  {ctrl.testingGithub ? 'Testando...' : 'Testar'}
                </button>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
              {ctrl.listingRepos ? 'Buscando seus repositórios…' : 'Nenhum repositório com acesso de escrita encontrado.'}
            </span>
          )}
          {ctrl.reposError && <ResultLine ok={false} text={ctrl.reposError} />}
        </div>
      )}

      {}
      {ctrl.githubRepo.trim() && mode !== 'existing' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--surface-elevated)', border: '1px solid var(--border-hairline)' }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', flexShrink: 0 }}>Selecionado:</span>
          <code style={{ flex: 1, minWidth: 0, fontFamily: 'monospace', fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ctrl.githubRepo}</code>
          <button type="button" onClick={ctrl.testGithub} disabled={ctrl.testingGithub} style={{ ...GHOST_BTN, padding: '6px 12px', opacity: ctrl.testingGithub ? 0.6 : 1 }}>
            {ctrl.testingGithub ? 'Testando...' : 'Testar'}
          </button>
        </div>
      )}
    </>
  )
}


export function AvisoSemEscrita({ ctrl }: { ctrl: ConfigController }) {
  if (!ctrl.githubResult?.ok || ctrl.githubResult.canWrite !== false) return null
  return (
    <p
      role="status"
      style={{
        margin: 0, padding: '8px 12px', fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-secondary)',
        background: 'rgb(214 158 46 / 0.08)', border: '1px solid rgb(214 158 46 / 0.22)', borderRadius: 'var(--radius-md)',
      }}
    >
      Atenção: este token não tem permissão de escrita no repositório. O Cérebro consegue ler, mas não conseguirá gravar novas anotações.
    </p>
  )
}
