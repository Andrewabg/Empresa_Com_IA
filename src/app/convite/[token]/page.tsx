import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverDb, ssrClient } from '@/server/supabase'
import { hashToken } from '@/lib/equipe-token'
import { conviteValido } from '@/lib/equipe'
import {
  aceitarConvite, AVISO_ENTRE_PELA_TELA, ERRO_CAMPOS_VAZIOS, ERRO_SENHA_LONGA,
} from '@/lib/equipe-aceite'
import {
  reclamarConvite, desfazerClaim, inserirMembro, finalizarConvite,
} from '@/data/equipe'


export const metadata = { title: 'Convite', description: 'Entre na empresa de IA.' }

export default async function ConvitePage({
  params, searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { token } = await params
  const { error: errorMsg } = await searchParams

  
  const { data: convite } = await serverDb()
    .from('equipe_convites')
    .select('expira_em, aceito_em')
    .eq('token_hash', hashToken(token))
    .maybeSingle()

  const valido = convite
    ? conviteValido(Date.now(), new Date(convite.expira_em).getTime(),
        convite.aceito_em ? new Date(convite.aceito_em).getTime() : null)
    : false

  if (!valido) {
    return <ConviteInvalido />
  }

  async function aceitar(formData: FormData) {
    'use server'
    const { token: t } = await params
    const email = (formData.get('email') as string | null)?.trim() ?? ''
    const password = (formData.get('password') as string | null) ?? ''
    if (!email || !password) redirect(`/convite/${t}?error=${encodeURIComponent(ERRO_CAMPOS_VAZIOS)}`)
    if (password.length > 72) redirect(`/convite/${t}?error=${encodeURIComponent(ERRO_SENHA_LONGA)}`)

    
    
    
    
    
    const resultado = await aceitarConvite(
      {
        reclamarConvite,
        async criarUsuario(emailDoConvidado, senha) {
          const { data, error } = await serverDb().auth.admin.createUser({
            email: emailDoConvidado, password: senha, email_confirm: true,
          })
          return data?.user
            ? { ok: true, userId: data.user.id }
            : { ok: false, codigo: error?.code, motivo: error?.message }
        },
        inserirMembro,
        finalizarConvite,
        desfazerClaim,
        async apagarUsuario(userId) {
          const { error } = await serverDb().auth.admin.deleteUser(userId)
          if (error) throw new Error(error.message)
        },
      },
      { tokenHash: hashToken(t), email, senha: password, agoraIso: new Date().toISOString() },
    )
    if (!resultado.ok) redirect(`/convite/${t}?error=${encodeURIComponent(resultado.erro)}`)

    
    
    
    
    
    const cs = await cookies()
    const supabase = ssrClient(cs)
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signErr) {
      console.warn('[aceite] login automático falhou depois do aceite:', signErr.message)
      redirect(`/login?notice=${encodeURIComponent(AVISO_ENTRE_PELA_TELA)}`)
    }
    redirect('/')
  }

  return <ConviteForm errorMsg={errorMsg} action={aceitar} />
}



function ConviteInvalido() {
  return (
    <Vignette>
      <main
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          padding: '0 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            backgroundImage: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            display: 'inline-block',
          }}
        >
          Awave Agents
        </span>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 6vw, 38px)',
            fontWeight: 600,
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Convite indisponível
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 14.5,
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
          }}
        >
          Convite inválido ou expirado. Peça um novo ao dono.
        </p>
      </main>
    </Vignette>
  )
}



function ConviteForm({
  errorMsg,
  action,
}: {
  errorMsg: string | undefined
  action: (formData: FormData) => Promise<void>
}) {
  return (
    <Vignette>
      <main
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          padding: '0 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 40,
        }}
      >
        {}
        <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              backgroundImage: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              display: 'inline-block',
            }}
          >
            Awave Agents
          </span>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 6vw, 38px)',
              fontWeight: 600,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Você foi convidado
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14.5,
              lineHeight: 1.55,
              color: 'var(--text-secondary)',
            }}
          >
            Crie seu acesso à empresa de IA.
          </p>
        </header>

        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {}
          {errorMsg && (
            <div
              role="alert"
              style={{
                padding: '10px 14px',
                background: 'rgb(229 99 77 / 0.08)',
                border: '1px solid rgb(229 99 77 / 0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: 13.5,
                color: 'var(--reject)',
                lineHeight: 1.45,
              }}
            >
              {errorMsg}
            </div>
          )}

          <Field id="email" label="E-mail" type="email" required autoComplete="email" />
          <Field id="password" label="Senha" type="password" required autoComplete="new-password" />

          <button
            type="submit"
            style={{
              marginTop: 4,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--bg-base)',
              background: 'var(--text-primary)',
              border: '1px solid transparent',
              borderRadius: 'var(--radius-md)',
              padding: '13px 24px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Criar acesso
          </button>
        </form>
      </main>
    </Vignette>
  )
}



function Vignette({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      {}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 90% at 50% 18%, rgb(255 255 255 / 0.03), transparent 60%), radial-gradient(140% 100% at 50% 120%, rgb(10 11 13 / 0.6), transparent 55%)',
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  )
}

function Field({
  id,
  label,
  type,
  required,
  autoComplete,
}: {
  id: string
  label: string
  type: string
  required?: boolean
  autoComplete?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
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
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
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
    </div>
  )
}
