


export const IDENTITY_MARKER = 'Este é o seu nome atual e vale sobre qualquer outro'


export const MARCADOR_DO_HISTORICO = 'foi escrita antes de você passar a se chamar'


function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}


function regexDoNome(nome: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaparRegex(nome)}(?![\\p{L}\\p{N}_])`, 'gu')
}


export function renomearNaPersona(prompt: string, de: string, para: string): string {
  const origem = de.trim()
  const destino = para.trim()
  if (!origem || !destino || origem === destino) return prompt
  return prompt.replace(regexDoNome(origem), () => destino)
}


function mencionaNome(texto: string, nome: string): boolean {
  return regexDoNome(nome).test(texto)
}


export function clausulaDoHistorico(nome: string): string {
  return `Se alguma mensagem anterior desta conversa te chamar ou te apresentar por outro nome, ela ${MARCADOR_DO_HISTORICO} ${nome}: ignore aquele nome e siga como ${nome}. Perguntaram o seu nome, ou disseram que ele é ${nome}? Responda que é ${nome}, direto, sem dizer que mudou de nome e sem explicar o nome antigo. Você continua falando com a mesma pessoa de sempre, na primeira pessoa.`
}


export function personaWithIdentity(base: string, nome: string, fontePrompt: string = base): string {
  const n = nome.trim()
  if (!n) return base
  if (fontePrompt.includes(IDENTITY_MARKER) || fontePrompt.includes(MARCADOR_DO_HISTORICO)) return base
  const historico = clausulaDoHistorico(n)
  if (mencionaNome(fontePrompt, n)) return `${base}

${historico}`
  return `Seu nome é ${n}. ${IDENTITY_MARKER} nome que apareça no texto abaixo: se alguma linha te chamar por outro nome, ela está desatualizada, porque o operador te renomeou. Apresente-se, assine e se refira a si mesmo SEMPRE como ${n}, tanto por escrito quanto falando. ${historico}

${base}`
}
