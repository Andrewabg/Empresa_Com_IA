import { Card } from './parts'

export function PersonaCard({ name, value, onChange, readOnly }: {
  name: string
  value: string
  onChange: (v: string) => void
  
  readOnly?: boolean
}) {
  return (
    <Card
      label="Persona (instruções do sistema)"
      hint={readOnly
        ? 'Este atendente é editado pelo Treino — edite com segurança e publique por lá.'
        : 'Quem o agente é e como age. Salvar muda o comportamento da próxima resposta na conversa e na voz.'}
      bodyScroll={false}
      style={{ flex: '1 1 0' }}
    >
      <textarea
        id="agent-system-prompt"
        aria-label={`Persona do ${name} (instruções do sistema)`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        className="cc-scroll"
        style={{
          
          
          width: '100%', height: '100%', minHeight: 200, boxSizing: 'border-box', resize: 'none',
          background: 'var(--surface-elevated)', border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-md)', padding: '13px 15px', color: readOnly ? 'var(--text-tertiary)' : 'var(--text-primary)',
          fontFamily: 'var(--font-ui)', fontSize: 13.5, lineHeight: 1.6, outline: 'none',
          cursor: readOnly ? 'default' : 'text',
        }}
      />
    </Card>
  )
}
