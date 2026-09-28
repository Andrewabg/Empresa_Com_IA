'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { springPreset, useReducedMotion } from '@/lib/motion'
import { Wave } from '@/components/wave/Wave'
import { useWave } from '@/components/wave/useWave'
import { SetupStep } from '@/components/ui/SetupStep'
import { WizardProgress } from '@/components/ui/WizardProgress'
import { useStreamLevel } from '@/components/orb/useStreamLevel'
import { useSaudacaoFalada } from './useSaudacaoFalada'
import { useConfigController } from '@/app/config/useConfigController'
import { KeysStep } from './KeysStep'
import { composeGreetingText } from '@/server/onboarding/greeting'
import { DEFAULT_BRANDING } from '@/lib/branding'
import {
  FIRST_STEP,
  back as backState,
  currentStepId,
  isLastStep,
  next as nextState,
  type OnboardingState,
} from '@/lib/onboarding'
import { FORM_INICIAL, canAdvance, dicaMinimo, type WizardField } from '@/lib/onboarding-wizard'
import { camposDoModo, type ModoNascimento } from '@/lib/onboarding/modo'


interface CompanyForm {
  companyName: string
  operatorName: string
  voiceTone: string
  mission: string
}


interface BirthOutcome {
  committed: boolean
  commitSha?: string
}


export function OnboardingClient({
  assistantName = DEFAULT_BRANDING.assistantName,
}: {
  
  assistantName?: string
}) {
  const reduced = useReducedMotion() ?? false
  const wave = useWave()
  const { setThinking } = wave

  const [state, setState] = useState<OnboardingState>(FIRST_STEP)
  const [direction, setDirection] = useState(1)

  
  
  const { ctrl } = useConfigController()

  
  
  
  const [modo, setModo] = useState<ModoNascimento | null>(null)

  
  
  
  const [fieldIndex, setFieldIndex] = useState(0)

  
  
  
  const campos = camposDoModo(modo ?? 'com_empresa')
  const preEmpresa = modo === 'pre_empresa'

  
  const [waveBorn, setWaveBorn] = useState(false)

  
  
  
  const [form, setForm] = useState<CompanyForm>(FORM_INICIAL)

  
  const [birth, setBirth] = useState<BirthOutcome | null>(null)

  const stepId = currentStepId(state)

  
  
  
  
  const giveBirth = useCallback(async () => {
    try {
      
      
      const payload = preEmpresa
        ? { preEmpresa: true, operatorName: form.operatorName }
        : form
      const res = await fetch('/api/onboarding/birth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        
        
        
        signal: AbortSignal.timeout(20000),
      })
      if (res.ok) {
        const data = (await res.json()) as BirthOutcome
        setBirth({ committed: !!data.committed, commitSha: data.commitSha })
      } else {
        setBirth({ committed: false })
      }
    } catch {
      setBirth({ committed: false })
    }
  }, [form, preEmpresa])

  
  
  
  const birthStartedRef = useRef(false)
  const goNext = useCallback(() => {
    setDirection(1)
    if (isLastStep(state) && !birthStartedRef.current) {
      birthStartedRef.current = true
      void giveBirth()
    }
    setState(nextState)
  }, [state, giveBirth])

  const goBack = useCallback(() => {
    setDirection(-1)
    setState((s) => backState(s))
  }, [])

  
  
  
  
  const advanceField = useCallback(() => {
    const field = campos[fieldIndex]
    if (!field || !canAdvance(field, form[field.key])) return
    setDirection(1)
    wave.pulse({ id: `wizard-${fieldIndex}`, t: performance.now() })
    if (fieldIndex >= campos.length - 1) {
      goNext()
    } else {
      setFieldIndex((i) => Math.min(i + 1, campos.length - 1))
    }
  }, [campos, fieldIndex, form, wave, goNext])

  
  const chooseModo = useCallback((escolha: ModoNascimento) => {
    setDirection(1)
    setFieldIndex(0)
    setModo(escolha)
  }, [])

  
  
  const retreatField = useCallback(() => {
    if (fieldIndex === 0) {
      setDirection(-1)
      setModo(null)
      return
    }
    setDirection(-1)
    setFieldIndex((i) => Math.max(i - 1, 0))
  }, [fieldIndex])

  
  
  useEffect(() => {
    if (stepId === 'company' && !waveBorn) {
      setWaveBorn(true)
    }
  }, [stepId, waveBorn])

  
  const greeting = useSaudacaoFalada()
  const greetingSpeaking = greeting.state.status === 'speaking'
  const { setListening } = wave
  
  useStreamLevel(greetingSpeaking ? greeting.remoteStream : null, {
    onLevel: (level) => {
      if (greetingSpeaking) setListening(level)
    },
  })

  
  
  
  
  useEffect(() => {
    if (state.phase !== 'ritual' || stepId !== 'jarvis') return
    if (!greetingSpeaking) {
      setThinking(false)
      setListening(0)
    }
  }, [stepId, state.phase, greetingSpeaking, setThinking, setListening])

  
  useEffect(() => {
    if (stepId !== 'jarvis') greeting.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId])

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg-base)',
      }}
    >
      {}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 90% at 50% 18%, rgb(255 255 255 / 0.035), transparent 60%), radial-gradient(140% 100% at 50% 120%, rgb(10 11 13 / 0.7), transparent 55%)',
          pointerEvents: 'none',
        }}
      />

      <main
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(28px, 5vh, 56px)',
          padding: 'clamp(40px, 8vh, 96px) 24px',
          width: '100%',
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        {}
        <OndaPresence
          wave={wave}
          born={waveBorn}
          phase={state.phase}
          stepId={stepId}
          reduced={reduced}
        />

        {}
        <div style={{ width: '100%', position: 'relative' }}>
          <AnimatePresence mode="wait" initial={false}>
            {state.phase === 'birth' ? (
              <Birth key="birth" wave={wave} reduced={reduced} birth={birth} preEmpresa={preEmpresa} />
            ) : stepId === 'company' && modo === null ? (
              <ModoChoice key="modo" direction={direction} onChoose={chooseModo} />
            ) : stepId === 'company' ? (
              <CompanyWizard
                key={`field-${fieldIndex}`}
                fieldIndex={fieldIndex}
                campos={campos}
                direction={direction}
                form={form}
                setForm={setForm}
                onAdvance={advanceField}
                onRetreat={retreatField}
                assistantName={assistantName}
              />
            ) : stepId === 'keys' ? (
              <KeysStep key="keys" ctrl={ctrl} direction={direction} onNext={goNext} onBack={goBack} />
            ) : (
              <JarvisStep
                key="jarvis"
                direction={direction}
                form={form}
                greeting={greeting}
                onNext={goNext}
                onBack={goBack}
                assistantName={assistantName}
                preEmpresa={preEmpresa}
              />
            )}
          </AnimatePresence>
        </div>

        {}
        {state.phase === 'ritual' && stepId === 'company' && modo !== null && (
          <WizardProgress index={fieldIndex} total={campos.length} />
        )}
      </main>
    </div>
  )
}



function OndaPresence({
  wave,
  born,
  phase,
  stepId,
  reduced,
}: {
  wave: ReturnType<typeof useWave>
  born: boolean
  phase: OnboardingState['phase']
  stepId: ReturnType<typeof currentStepId>
  reduced: boolean
}) {
  
  const big = phase === 'birth' || stepId === 'jarvis'

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 560,
        height: 132,
        display: 'grid',
        placeItems: 'center',
        position: 'relative',
      }}
    >
      {}
      <AnimatePresence>
        {!born && (
          <motion.div
            key="seed"
            aria-hidden
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.4 }}
            style={{
              position: 'absolute',
              width: '70%',
              height: 1,
              background:
                'linear-gradient(90deg, transparent, rgb(255 255 255 / 0.14), transparent)',
            }}
          />
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {born && (
          <motion.div
            key="onda"
            
            
            
            initial={
              reduced
                ? { opacity: 1, scale: 1, scaleY: 1 }
                : { opacity: 0, scale: 1, scaleY: 0.06 }
            }
            animate={{
              opacity: 1,
              scaleY: 1,
              
              scale: big ? 1.18 : 1,
            }}
            exit={{ opacity: 0, scaleY: 0.06, transition: { duration: 0.3 } }}
            transition={
              reduced
                ? { duration: 0 }
                : { ...springPreset, stiffness: 140, damping: 22 }
            }
            style={{
              width: '100%',
              transformOrigin: 'center',
            }}
          >
            <Wave
              scale="inline"
              state={wave.state}
              amplitude={wave.amplitude}
              ripples={wave.ripples}
              aria-label="Onda — a voz da empresa nascendo"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}




function ModoChoice({
  direction,
  onChoose,
}: {
  direction: number
  onChoose: (modo: ModoNascimento) => void
}) {
  const opcoes: {
    modo: ModoNascimento
    titulo: string
    descricao: string
  }[] = [
    {
      modo: 'com_empresa',
      
      titulo: 'Já tenho uma empresa',
      descricao: 'Vamos dar identidade a ela: nome, voz e missão.',
    },
    {
      modo: 'pre_empresa',
      
      titulo: 'Ainda não, só quero conhecer',
      descricao: 'Comece sem empresa. Quando tiver uma, é só falar.',
    },
  ]

  return (
    <SetupStep
      index="01 · 01"
      kicker="O começo"
      
      title="Por onde começamos?"
      subtitle="Você já tem uma empresa pra colocar de pé, ou quer só conhecer por enquanto?"
      direction={direction}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {opcoes.map((o) => (
          <button
            key={o.modo}
            type="button"
            onClick={() => onChoose(o.modo)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 6,
              width: '100%',
              textAlign: 'left',
              padding: '18px 20px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              background: 'var(--surface)',
              border: '1px solid transparent',
              borderRadius: 'var(--radius-lg)',
              
              backgroundImage:
                'linear-gradient(var(--surface), var(--surface)), linear-gradient(120deg, var(--wave-from), var(--wave-to))',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                width: '100%',
                fontFamily: 'var(--font-ui)',
                fontSize: 17,
                fontWeight: 600,
              }}
            >
              {o.titulo}
              <span aria-hidden style={{ opacity: 0.55, fontSize: 18 }}>
                →
              </span>
            </span>
            <span
              style={{
                fontSize: 13.5,
                lineHeight: 1.5,
                color: 'var(--text-secondary)',
              }}
            >
              {o.descricao}
            </span>
          </button>
        ))}
      </div>
    </SetupStep>
  )
}



function CompanyWizard({
  fieldIndex,
  campos,
  direction,
  form,
  setForm,
  onAdvance,
  onRetreat,
  assistantName,
}: {
  fieldIndex: number
  
  campos: readonly WizardField[]
  direction: number
  form: CompanyForm
  setForm: React.Dispatch<React.SetStateAction<CompanyForm>>
  onAdvance: () => void
  onRetreat: () => void
  assistantName: string
}) {
  const total = campos.length
  const field = campos[fieldIndex]
  const value = form[field.key]
  const ok = canAdvance(field, value)
  
  
  const [tentou, setTentou] = useState(false)
  
  
  const dica = dicaMinimo(field, value, tentou)
  const dicaId = `wizard-dica-${field.key}`
  
  const showBack = true
  const last = fieldIndex === total - 1

  const tentarAvancar = () => {
    if (!ok) {
      setTentou(true)
      return
    }
    onAdvance()
  }

  return (
    <SetupStep
      index={`0${fieldIndex + 1} · 0${total}`}
      kicker="A voz toma forma"
      title={field.label}
      subtitle={field.microcopy}
      direction={direction}
    >
      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <WizardInput
          field={field}
          value={value}
          describedById={dicaId}
          onChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
          onEnter={tentarAvancar}
        />

        {}
        <p
          id={dicaId}
          aria-live="polite"
          style={{
            margin: 0,
            minHeight: 18,
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            lineHeight: '18px',
            color: 'var(--text-tertiary)',
            opacity: dica ? 1 : 0,
            transition: 'opacity 160ms ease',
          }}
        >
          {dica ?? ''}
        </p>
      </div>

      {}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: 8,
        }}
      >
        <button
          type="button"
          onClick={onRetreat}
          disabled={!showBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: showBack ? 'var(--text-secondary)' : 'transparent',
            fontFamily: 'var(--font-ui)',
            fontSize: 13.5,
            cursor: showBack ? 'pointer' : 'default',
            padding: '8px 4px',
          }}
        >
          {showBack ? '← Voltar' : ''}
        </button>

        {}
        <button
          type="button"
          onClick={tentarAvancar}
          aria-disabled={!ok || undefined}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-primary)',
            background: 'var(--surface-elevated)',
            border: '1px solid transparent',
            borderRadius: 'var(--radius-md)',
            padding: '11px 22px',
            cursor: ok ? 'pointer' : 'default',
            opacity: ok ? 1 : 0.45,
            backgroundImage:
              'linear-gradient(var(--surface-elevated), var(--surface-elevated)), linear-gradient(120deg, var(--wave-from), var(--wave-to))',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          {last ? `Conhecer o ${assistantName}` : 'Continuar'}
          <span aria-hidden style={{ opacity: 0.7 }}>
            →
          </span>
        </button>
      </div>
    </SetupStep>
  )
}


function WizardInput({
  field,
  value,
  describedById,
  onChange,
  onEnter,
}: {
  field: WizardField
  value: string
  
  describedById: string
  onChange: (value: string) => void
  onEnter: () => void
}) {
  const shared: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--border-hairline)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-ui)',
    fontSize: 16,
    lineHeight: 1.5,
    outline: 'none',
    resize: 'none',
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' && !(field.multiline && e.shiftKey)) {
      e.preventDefault()
      onEnter()
    }
  }
  return field.multiline ? (
    <textarea
      autoFocus
      aria-label={field.label}
      aria-describedby={describedById}
      rows={3}
      value={value}
      maxLength={field.maxLength}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      style={shared}
    />
  ) : (
    <input
      autoFocus
      aria-label={field.label}
      aria-describedby={describedById}
      type="text"
      value={value}
      maxLength={field.maxLength}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      style={shared}
    />
  )
}



const JARVIS_COPY = {
  kicker: 'Ele acorda',
  subtitle:
    'A presença que cuida da empresa enquanto você dorme. A partir de agora, ele é a sua voz.',
}

function JarvisStep({
  direction,
  form,
  greeting,
  onNext,
  onBack,
  assistantName,
  preEmpresa,
}: {
  direction: number
  form: CompanyForm
  greeting: ReturnType<typeof useSaudacaoFalada>
  onNext: () => void
  onBack: () => void
  assistantName: string
  preEmpresa: boolean
}) {
  return (
    <SetupStep
      index=""
      kicker={JARVIS_COPY.kicker}
      title={`Conheça o ${assistantName}`}
      subtitle={JARVIS_COPY.subtitle}
      direction={direction}
    >
      <JarvisIntro form={form} greeting={greeting} assistantName={assistantName} preEmpresa={preEmpresa} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: 8,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)',
            fontSize: 13.5,
            cursor: 'pointer',
            padding: '8px 4px',
          }}
        >
          ← Voltar
        </button>

        <button
          type="button"
          onClick={onNext}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-primary)',
            background: 'var(--surface-elevated)',
            border: '1px solid transparent',
            borderRadius: 'var(--radius-md)',
            padding: '11px 22px',
            cursor: 'pointer',
            backgroundImage:
              'linear-gradient(var(--surface-elevated), var(--surface-elevated)), linear-gradient(120deg, var(--wave-from), var(--wave-to))',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          {}
          {preEmpresa ? 'Dar o primeiro passo' : 'Dar à luz a empresa'}
          <span aria-hidden style={{ opacity: 0.7 }}>
            →
          </span>
        </button>
      </div>
    </SetupStep>
  )
}


function JarvisIntro({
  form,
  greeting,
  assistantName,
  preEmpresa,
}: {
  form: CompanyForm
  greeting: ReturnType<typeof useSaudacaoFalada>
  assistantName: string
  preEmpresa: boolean
}) {
  const { status } = greeting.state
  const idle = status === 'idle'
  const connecting = status === 'connecting'
  const speaking = status === 'speaking'
  const fallback = status === 'fallback'

  
  
  
  const greetedRef = useRef(false)
  useEffect(() => {
    if (greetedRef.current) return
    greetedRef.current = true
    void greeting.greet({ ...form, semEmpresa: preEmpresa, assistantName })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  
  
  
  
  const greetingText = `“${composeGreetingText(form, assistantName, { semEmpresa: preEmpresa })}”`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springPreset, delay: 0.1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '20px 22px',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {}
      <audio ref={greeting.audioRef} autoPlay playsInline style={{ display: 'none' }} />

      {}
      <p
        style={{
          margin: 0,
          fontSize: 16,
          lineHeight: 1.6,
          color: 'var(--text-primary)',
        }}
        aria-live="polite"
      >
        {greetingText}
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => greeting.greet({ ...form, semEmpresa: preEmpresa, assistantName })}
          disabled={connecting || speaking}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--font-ui)',
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--text-primary)',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 16px',
            cursor: connecting || speaking ? 'default' : 'pointer',
            opacity: connecting || speaking ? 0.7 : 1,
          }}
        >
          <span aria-hidden style={{ fontSize: 15 }}>
            ♪
          </span>
          {connecting
            ? 'acordando o Nathan…'
            : speaking
              ? 'o Nathan está falando…'
              : idle
                ? 'toque pra ouvir o Nathan'
                : 'ouvir de novo'}
        </button>

        <span
          style={{
            fontSize: 11.5,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          {fallback ? 'leia a saudação acima' : 'a voz da sua empresa'}
        </span>
      </div>
    </motion.div>
  )
}



function Birth({
  wave,
  reduced,
  birth,
  preEmpresa,
}: {
  wave: ReturnType<typeof useWave>
  reduced: boolean
  birth: BirthOutcome | null
  
  preEmpresa: boolean
}) {
  const { setThinking, pulse } = wave
  
  
  const [phase, setPhase] = useState<'thinking' | 'committed' | 'done'>(
    reduced ? 'done' : 'thinking',
  )
  const timers = useRef<number[]>([])

  useEffect(() => {
    if (reduced) {
      
      setThinking(false)
      return
    }
    
    setThinking(true)
    const t1 = window.setTimeout(() => {
      
      setThinking(false)
      pulse({ id: 'genesis-commit', t: performance.now() })
      setPhase('committed')
    }, 1100)
    const t2 = window.setTimeout(() => {
      
      pulse({ id: 'genesis-2', t: performance.now() })
    }, 1320)
    const t3 = window.setTimeout(() => {
      setPhase('done')
    }, 2200)
    timers.current = [t1, t2, t3]
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t))
      setThinking(false)
    }
  }, [reduced, setThinking, pulse])

  return (
    <motion.section
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.4 }}
      style={{
        width: '100%',
        maxWidth: 560,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
        textAlign: 'center',
      }}
      aria-live="polite"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          {phase === 'thinking'
            ? preEmpresa
              ? 'preparando tudo…' 
              : 'gravando no cérebro…'
            : 'gênese'}
        </span>
        <motion.h2
          key={phase === 'thinking' ? 'h-think' : 'h-born'}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springPreset}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(30px, 5vw, 46px)',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          {phase === 'thinking'
            ? 'Dando à luz…'
            : preEmpresa
              ? 'Tudo pronto.' 
              : 'Sua empresa nasceu.'}
        </motion.h2>
      </div>

      {}
      {!preEmpresa && (
        <CommitLine
          visible={phase !== 'thinking'}
          reduced={reduced}
          committed={birth?.committed}
          commitSha={birth?.commitSha}
        />
      )}

      {}
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springPreset, delay: reduced ? 0 : 0.1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
          >
            {}
            {birth ? (
              <>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: 'var(--text-secondary)',
                    maxWidth: 420,
                  }}
                >
                  {preEmpresa
                    ? 'Tudo pronto pra explorar. Quando você tiver uma empresa, é só falar.' 
                    : 'O cérebro tem seu primeiro registro. A empresa está viva e à sua frente.'}
                </p>
                <Link
                  href="/"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: 'var(--font-ui)',
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--bg-base)',
                    background: 'var(--text-primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 24px',
                    textDecoration: 'none',
                  }}
                >
                  Entrar no Command Center
                  <span aria-hidden>→</span>
                </Link>
              </>
            ) : (
              <p
                aria-live="polite"
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: 'var(--text-tertiary)',
                  maxWidth: 420,
                }}
              >
                Finalizando o nascimento…
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}


function CommitLine({
  visible,
  reduced,
  committed,
  commitSha,
}: {
  visible: boolean
  reduced: boolean
  committed?: boolean
  commitSha?: string
}) {
  const full =
    committed && commitSha
      ? `Curador · commit ${commitSha.slice(0, 7)}  "gênese: empresa criada"`
      : 'identidade salva, o Cérebro sincroniza quando o GitHub estiver pronto'
  const [text, setText] = useState(reduced ? full : '')

  useEffect(() => {
    if (!visible || reduced) {
      if (reduced) setText(full)
      return
    }
    let intervalId: number | undefined
    
    
    const startTimer = window.setTimeout(() => {
      let i = 0
      intervalId = window.setInterval(() => {
        i += 1
        setText(full.slice(0, i))
        if (i >= full.length) window.clearInterval(intervalId)
      }, 22)
    }, 120)
    return () => {
      window.clearTimeout(startTimer)
      if (intervalId !== undefined) window.clearInterval(intervalId)
    }
  }, [visible, reduced, full])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduced ? false : { opacity: 0, scaleX: 0.96 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={springPreset}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            maxWidth: 480,
            padding: '12px 16px',
            background: 'var(--surface)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            fontSize: 12.5,
            color: 'var(--text-secondary)',
            fontVariantNumeric: 'tabular-nums',
            textAlign: 'left',
          }}
        >
          <CommitDot />
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {text}
            {!reduced && text.length < full.length && (
              <span style={{ opacity: 0.6 }}>▍</span>
            )}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


function CommitDot() {
  return (
    <span
      aria-hidden
      style={{
        flexShrink: 0,
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
        boxShadow: '0 0 8px color-mix(in srgb, var(--wave-to) 50%, transparent)',
      }}
    />
  )
}
