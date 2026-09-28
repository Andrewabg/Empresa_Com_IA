import type { OnboardingSession, Perfil, Slot } from './types'
import { deveLadder, podeEspelhar } from './slots'
import { perguntaDoSlot } from './perfis'


const PERGUNTA_SEM_SLOT = 'Pode me contar mais sobre o seu negócio?'


const MIN_COBERTOS_PARA_HIPOTESE = 2


export interface DirectiveOpts {
  
  recemRoteado?: boolean
  
  aprofundar?: boolean
}


export function onboardingDirective(
  session: OnboardingSession,
  slot: Slot | null,
  opts: DirectiveOpts = {},
): string {
  const { fase } = session

  if (fase === 'concluida' || fase === 'adiada') {
    
    return ''
  }

  if (fase === 'abertura' || fase === 'roteamento') {
    return diretiva_abertura(session.perfil)
  }

  if (fase === 'entrevista') {
    return opts.recemRoteado ? diretiva_primeira_pergunta(slot) : diretiva_entrevista(session, slot, opts)
  }

  return ''
}


function diretiva_primeira_pergunta(slot: Slot | null): string {
  const pergunta = slot ? perguntaDoSlot(slot.id) : PERGUNTA_SEM_SLOT
  return [
    '## LEIS DA ENTREVISTA (o dono acabou de dizer o que quer fazer aqui)',
    '',
    '1. **Comemore em UMA frase curta** e emende a primeira pergunta. Nada de discurso.',
    '',
    `2. **Uma pergunta por turno** — faça SOMENTE esta: "${pergunta}" (slot: ${slot?.id ?? ''})`,
    '   - NÃO empilhe perguntas. Pergunte o PASSADO CONCRETO, nunca o hipotético.',
    '',
    '3. **NÃO chame `registrarEntrevista` neste turno** — o dono declarou a INTENÇÃO dele, não',
    '   respondeu nenhum tópico ainda. Não há fato para gravar; inventar um é proibido.',
    '',
    '4. **Não formule hipótese** sobre o negócio: você ainda não sabe nada sobre ele.',
    '',
    '> Resumo: uma frase de boas-vindas, a primeira pergunta, e nada de tool.',
  ].join('\n')
}


const PERFIL_PRE_EMPRESA = new Set<Perfil>(['curioso', 'sem_empresa'])

function diretiva_abertura(perfil: Perfil | null): string {
  if (perfil && PERFIL_PRE_EMPRESA.has(perfil)) {
    return diretiva_abertura_pre_empresa()
  }
  
  return [
    'Você é um copiloto executivo — um time de C-level que pensa junto com o dono.',
    'Abra encantando: mostre o que é possível (copiloto, time de C-level, agentes) em 1-2 frases.',
    'Depois faça UMA ÚNICA pergunta de intenção — o que te trouxe aqui? Montar, testar ou revender?',
    'NÃO peça dados de empresa agora. Só entenda a intenção do usuário.',
    'A INTERFACE já mostra os botões de resposta ("Tenho uma empresa", "Ainda não tenho empresa",',
    '"Quero revender", "Só quero explorar") logo abaixo da sua mensagem. NÃO escreva essa lista no',
    'texto e não diga "chips": o comprador leria as opções duas vezes, uma delas com nome interno.',
  ].join('\n')
}


function diretiva_abertura_pre_empresa(): string {
  
  return [
    'Você é um copiloto executivo — um time de C-level. A pessoa AINDA não tem empresa (ou só quer explorar).',
    'Abra encantando com o que o copiloto FAZ e no que ele VIRA — cite 2-3 exemplos nomeados e concretos:',
    'ex.: "o Rui lê seus anúncios do Meta e aponta o que sangra dinheiro", "a Lia escreve a copy da campanha",',
    '"o Alan revisa contrato e vigia prazos" — para inspirar, não para vender.',
    'Convide a pessoa a explorar e perguntar o que quiser — sem pressão, sem pressa, no ritmo dela.',
    'LEI DO NÃO-INSISTIR: NÃO cobre que ela cadastre/monte uma empresa. NUNCA peça dados de empresa agora.',
    'NÃO re-ofereça os chips de intenção (Tenho uma empresa / revender / explorar) — a intenção já é conhecida.',
    'Deixe UMA porta aberta (gatilho de conversão): diga que, no momento em que ela TIVER uma empresa,',
    'basta dizer "tenho uma empresa" que você configura tudo na hora, ali mesmo na conversa.',
  ].join('\n')
}

function diretiva_entrevista(session: OnboardingSession, slot: Slot | null, opts: DirectiveOpts = {}): string {
  const pergunta = slot ? perguntaDoSlot(slot.id) : PERGUNTA_SEM_SLOT
  const labelSlot = slot?.id ?? ''
  
  
  
  
  
  
  const espelhar = slot && podeEspelhar(slot) ? (slot.valor ?? '').trim() : ''

  
  const cobertos = session.slots.filter((s) => s.status === 'coberto' && s.valor)
  const hipoteseAha = `Com base no que você já me contou, minha hipótese é: ${cobertos.map((s) => s.valor).join('; ')}. Faz sentido?`

  
  
  
  const deveAprofundar = slot && !espelhar ? (opts.aprofundar ?? deveLadder(slot)) : false

  
  
  const partes: string[] = ['## LEIS DA ENTREVISTA (seguir nesta ordem neste turno)', '']
  let n = 0
  const lei = (...linhas: string[]) => {
    n += 1
    partes.push(`${n}. ${linhas[0]}`, ...linhas.slice(1), '')
  }

  
  
  const jaRespondido = !!slot && (slot.status === 'coberto' || slot.status === 'pendente_commit')
  const valorRaso = jaRespondido ? (slot?.valor ?? '').trim() : ''

  if (espelhar) {
    lei(
      `**Confirme o que já foi capturado** — o operador JÁ respondeu sobre isto (slot: ${labelSlot}) e o`,
      `   sistema guardou: "${espelhar}".`,
      '   - Espelhe isso em UMA frase, com as suas palavras, e peça a confirmação ("é isso?").',
      '   - NÃO empilhe perguntas: a confirmação é a ÚNICA pergunta deste turno.',
      '   - NÃO repita a pergunta original nem peça a informação de novo — ele já respondeu.',
      '   - Confirmou → CHAME `registrarEntrevista` com este topicId e `precisaConfirmar: false`.',
      '   - Corrigiu → CHAME `registrarEntrevista` com o valor CORRIGIDO.',
    )
  } else if (valorRaso) {
    lei(
      `**Aprofunde o que já está gravado** — sobre ${labelSlot} o operador já disse: "${valorRaso}".`,
      '   - NÃO repita a pergunta original: ele já respondeu e re-perguntar soa a desatenção.',
      '   - Faça UMA pergunta que peça o que FALTA: um número, um exemplo real, um nome, um "quanto".',
      '   - Se ele não quiser detalhar, aceite e siga. Isto é conversa, não formulário.',
      '   - Com a resposta, CHAME `registrarEntrevista` no MESMO topicId, com o valor ENRIQUECIDO',
      '     (o que ele já tinha dito MAIS o detalhe novo) e a profundidade real.',
    )
  } else {
    lei(
      `**Uma pergunta por turno** — faça SOMENTE esta: "${pergunta}" (slot: ${labelSlot})`,
      '   - NÃO empilhe perguntas. NÃO peça hipotético ("você faria X?"). Pergunte o PASSADO CONCRETO.',
      '   - Este turno TERMINA numa pergunta. Nunca encerre com "vemos isso depois" nem anuncie o que vai',
      '     perguntar mais tarde: se o assunto é o próximo, pergunte AGORA.',
      '   - Pergunte ESTE tópico, não outro que te pareça mais interessante: o motor grava a resposta',
      '     no slot acima, então perguntar outra coisa arquiva o dado com o rótulo errado.',
    )
  }

  
  
  if (deveAprofundar && !valorRaso) {
    lei('**Aprofundamento (laddering)** — se a resposta for vaga, sonde: "Pode dar um exemplo concreto?" ou "Quanto isso representa em número?"')
  }

  
  
  
  
  
  if (!espelhar && cobertos.length >= MIN_COBERTOS_PARA_HIPOTESE) {
    lei(
      `**Hipótese aha (ancorada nos dados gravados)** — DEPOIS da pergunta e nunca no lugar da pergunta,`,
      `   ofereça em UMA linha: "${hipoteseAha}" — como HIPÓTESE, nunca afirmação.`,
      '   - Se não couber sem empilhar perguntas, PULE a hipótese. A pergunta é a prioridade.',
      '   - A hipótese é SUA leitura, não fala do operador: um "sim" a ela não cobre tópico que você não perguntou.',
    )
  }

  lei(
    '**Lei da tool** — após qualquer resposta substantiva (não vazia, não um "sim" sozinho):',
    '   - CHAME `registrarEntrevista` com o topicId, o conteúdo extraído e a profundidade estimada.',
    '   - Só prossiga para a próxima pergunta DEPOIS de chamar a tool.',
    '   - Se o usuário corrigir a hipótese, registre o valor corrigido.',
  )
  lei('**Funil** — mantenha o foco no slot atual. Só avance de slot quando este estiver coberto.')

  partes.push('> Resumo: faz sentido → tool → próximo slot. Nunca empilhe perguntas. Sempre passado concreto.')

  return partes.join('\n')
}
