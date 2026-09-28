import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverDb, ssrClient } from '@/server/supabase'
import { podeSignup, signupOutcome } from '@/server/auth/operator'
import { getOperator } from '@/server/auth/session'
import { bindOperatorIdentity, getBoundOperatorId } from '@/server/auth/operatorIdentity'
import { RecuperarAcesso } from './RecuperarAcesso'


export const metadata = {
  title: 'Entrar',
  description: 'Entre na sua empresa de IA.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>
}) {
  const cookieStore = await cookies()

  
  const current = await getOperator(cookieStore)
  if (current) redirect('/')

  const isSignup = podeSignup(await getBoundOperatorId(serverDb()))
  const { error: errorMsg, notice: noticeMsg } = await searchParams

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
              backgroundImage:
                'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
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
            {isSignup ? 'Criar operador' : 'Entrar'}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14.5,
              lineHeight: 1.55,
              color: 'var(--text-secondary)',
            }}
          >
            {isSignup
              ? 'Primeiro acesso — configure o operador da empresa.'
              : 'Acesso restrito ao operador.'}
          </p>
        </header>

        {}
        {isSignup ? (
          <AuthForm mode="signup" errorMsg={errorMsg} noticeMsg={noticeMsg} />
        ) : (
          <>
            <AuthForm mode="login" errorMsg={errorMsg} noticeMsg={noticeMsg} />
            {}
            <RecuperarAcesso />
            {}
          </>
        )}
      </main>
    </div>
  )
}



function AuthForm({
  mode,
  errorMsg,
  noticeMsg,
}: {
  mode: 'signup' | 'login'
  errorMsg: string | undefined
  noticeMsg: string | undefined
}) {
  async function authAction(formData: FormData) {
    'use server'
    const email = (formData.get('email') as string | null)?.trim() ?? ''
    const password = (formData.get('password') as string | null) ?? ''

    if (!email || !password) {
      redirect(`/login?error=${encodeURIComponent('Por favor, preencha todos os campos.')}`)
    }
    if (password.length > 72) {
      redirect(`/login?error=${encodeURIComponent('Senha muito longa (máximo 72 caracteres).')}`)
    }

    const cookieStore = await cookies()
    const supabase = ssrClient(cookieStore)

    if (mode === 'signup') {
      
      if (!podeSignup(await getBoundOperatorId(serverDb()))) {
        redirect(`/login?error=${encodeURIComponent('Cadastro não permitido.')}`)
      }
      
      
      const { data: createData, error: createErr } = await serverDb().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (createErr) {
        redirect(`/login?error=${encodeURIComponent(createErr.message)}`)
      }
      
      
      
      
      if (createData?.user) {
        await bindOperatorIdentity(serverDb(), createData.user.id)
        
        
        
        
        
        const { data: boundId } = await serverDb().rpc('get_operator_id')
        if (boundId !== createData.user.id) {
          redirect(`/login?error=${encodeURIComponent('Já existe um operador desta empresa. Entre com sua conta.')}`)
        }
        
        
        
        
        
        try {
          await serverDb().from('equipe_membros').upsert(
            { user_id: createData.user.id, papel: 'dono', email, convidado_por: null },
            { onConflict: 'user_id' },
          )
        } catch {  }
      }
      
      const signInRes = await supabase.auth.signInWithPassword({ email, password })
      if (signInRes.error) {
        redirect(`/login?error=${encodeURIComponent(signInRes.error.message)}`)
      }
      
      if (signupOutcome(signInRes.data.session) === 'confirm-email') {
        redirect(
          `/login?notice=${encodeURIComponent('Cadastro feito. Confirme seu e-mail para entrar.')}`,
        )
      }
      redirect('/')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        redirect(`/login?error=${encodeURIComponent(error.message)}`)
      }
      redirect('/')
    }
  }

  return (
    <form
      action={authAction}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      {noticeMsg && (
        <div
          role="status"
          style={{
            padding: '10px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13.5,
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
          }}
        >
          {noticeMsg}
        </div>
      )}
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
      <Field
        id="password"
        label="Senha"
        type="password"
        required
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
      />

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
        {mode === 'signup' ? 'Criar operador' : 'Entrar'}
      </button>
    </form>
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
