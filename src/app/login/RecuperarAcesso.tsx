
const GUIA_RECUPERAR_SENHA = 'https://elitedaia.com.br/guia/empresa-ia/manter/recuperar-senha'

export function RecuperarAcesso() {
  return (
    <p style={{ margin: '14px 0 0', textAlign: 'center', fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-tertiary)' }}>
      Esqueceu a senha? Só quem instalou este sistema consegue redefini-la. Se não foi você,
      fale com quem instalou.{' '}
      <a
        href={GUIA_RECUPERAR_SENHA}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}
      >
        Ver o passo a passo
      </a>
    </p>
  )
}
