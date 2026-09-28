'use client'



import { useState } from 'react'
import { AVISO_DEPLOY_AUTOMATICO } from '@/lib/avisoDeployAutomatico'

const TEAL = 'var(--wave-from)'
const MUTED = 'var(--text-tertiary)'

export function DeployWebhookHelp() {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {open ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 15 }}>
          <ol
            style={{
              margin: 0,
              paddingLeft: 20,
              listStyleType: 'decimal',
              fontSize: 12.5,
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
            }}
          >
            <li>
              No EasyPanel, abra o <strong>serviço do seu Motor</strong> → aba{' '}
              <strong>Implantações</strong> (ou nome parecido, tipo <em>Deployments</em>).
            </li>
            <li>
              Role até <strong>Gatilho de Implantação</strong> e copie a{' '}
              <strong>URL</strong> — algo como{' '}
              <code>http://…/api/deploy/&lt;token&gt;</code>. É única por serviço.
            </li>
            <li>Cole no campo abaixo e salve.</li>
            <li>
              {}
              {AVISO_DEPLOY_AUTOMATICO}
            </li>
          </ol>
          <p
            style={{
              margin: 0,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              paddingLeft: 18,
              fontSize: 12.5,
              lineHeight: 1.5,
              color: TEAL,
            }}
          >
            <span
              aria-hidden
              style={{ width: 7, height: 7, marginTop: 5, borderRadius: 99, background: TEAL, flexShrink: 0 }}
            />
            <span>
              Com o webhook, a atualização <strong>sobe sozinha</strong> — você não precisa
              entrar no EasyPanel.
            </span>
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            alignSelf: 'flex-start',
            marginLeft: 15,
            padding: 0,
            border: 'none',
            background: 'none',
            color: MUTED,
            fontSize: 12.5,
            fontFamily: 'var(--font-ui)',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Como pegar o webhook ↓
        </button>
      )}
    </div>
  )
}
