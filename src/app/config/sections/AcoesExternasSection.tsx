'use client'



import type { ConfigController } from '../controller'
import { Field, TestButton, ResultLine } from '../ui'
import { ConnectionsSection } from '../ConnectionsSection'
import { SectionHeader } from '../SectionHeader'

export function AcoesExternasSection({ ctrl }: { ctrl: ConfigController }) {
  const dirty = ctrl.composioKey.trim().length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="Ações externas"
        description="Opcional. Dê ao Nathan o poder de agir no mundo — ler e, com sua aprovação, escrever no Gmail, no Calendar e em centenas de apps."
      />

      {}
      <form
        onSubmit={(e) => { e.preventDefault(); void ctrl.save() }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: '20px',
          background: 'var(--surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Composio
          </h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            A chave que conecta suas contas às ferramentas dos agentes.
          </p>
        </div>
        <Field
          id="composio_api_key"
          label="Composio API Key"
          placeholder="ak_..."
          value={ctrl.composioKey}
          onChange={ctrl.setComposioKey}
          configured={ctrl.data?.status.composio_api_key ?? false}
          type="password"
          microcopy={
            <>
              No painel do Composio, a chave fica em{' '}
              <strong>Settings → Project Settings → API Keys</strong> e começa com{' '}
              <code style={{ fontFamily: 'monospace' }}>ak_</code> — copie <em>só a chave</em>,
              não o comando de exemplo. Ao criar, dê a ela{' '}
              <strong>permissão total (leitura e escrita)</strong>: uma chave só de leitura
              passa no “Testar” aqui e depois recusa conectar suas contas. Depois conecte suas
              contas (Gmail, Calendar…) sob o usuário{' '}
              <code style={{ fontFamily: 'monospace' }}>operator</code>.
            </>
          }
          validity={
            ctrl.composioResult ? (ctrl.composioResult.ok ? 'valid' : 'invalid') : 'unknown'
          }
          action={<TestButton onClick={ctrl.testComposio} testing={ctrl.testingComposio} />}
          helper={
            <>
              <a
                href="https://dashboard.composio.dev/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginTop: 2,
                  fontSize: 12.5,
                  color: 'var(--wave-from)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                Abrir o painel do Composio — pegue a chave e conecte suas contas ↗
              </a>
              {ctrl.composioResult && (
                <ResultLine
                  ok={ctrl.composioResult.ok}
                  text={
                    ctrl.composioResult.ok
                      ? 'chave aceita para leitura — o Composio respondeu. Conectar uma conta exige permissão de escrita; se falhar ali, gere a chave de novo com permissão total.'
                      : `chave inválida${ctrl.composioResult.error ? ` (${ctrl.composioResult.error})` : ''}`
                  }
                />
              )}
            </>
          }
        />

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
        {dirty && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14 }}>
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
              {ctrl.saving ? 'Salvando...' : 'Salvar chave'}
            </button>
          </div>
        )}
      </form>

      <ConnectionsSection />
    </div>
  )
}
