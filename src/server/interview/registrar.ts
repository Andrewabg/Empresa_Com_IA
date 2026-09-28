
import { persistirNotaEmpresa, contaComoPersistido, registrarEntrevista } from '@/server/onboarding/registrarEntrevista'
import { pisoProfundidade } from '@/lib/onboarding/profundidade'
import { ehTopicoValido } from '@/lib/onboarding/topicoValido'
import { NOME_EMPRESA_ID } from '@/lib/onboarding/perfis'
import { motivoSeguro } from '@/lib/sanitizarErro'

export interface RegistrarResult {
  status: 'registrado' | 'topico_invalido' | 'falha_commit' | 'aguardando_confirmacao'
  path?: string
}

export interface RegistrarConhecimentoInput {
  topicId: string
  conteúdo: string
  
  operatorId?: string
  conversationId?: string
}

export interface RegistrarDeps {
  registrar: typeof registrarEntrevista
  persistirNota: typeof persistirNotaEmpresa
}

const DEPS_PADRAO: RegistrarDeps = { registrar: registrarEntrevista, persistirNota: persistirNotaEmpresa }

export async function registrarConhecimento(
  input: RegistrarConhecimentoInput,
  deps: RegistrarDeps = DEPS_PADRAO,
): Promise<RegistrarResult> {
  if (!ehTopicoValido(input.topicId)) return { status: 'topico_invalido' }
  
  
  
  if (input.topicId === NOME_EMPRESA_ID) return { status: 'topico_invalido' }
  const path = `empresa/${input.topicId}.md`

  
  
  
  
  
  
  if (input.operatorId) {
    const r = await deps.registrar({
      operatorId: input.operatorId,
      conversationId: input.conversationId,
      topicId: input.topicId,
      conteúdo: input.conteúdo,
      valor: input.conteúdo,
      profundidade: pisoProfundidade(input.conteúdo),
      precisaConfirmar: false,
      falaDoDono: input.conteúdo,
    })
    if (r.status === 'topico_invalido') return { status: 'topico_invalido' }
    if (r.status === 'aguardando_confirmacao') return { status: 'aguardando_confirmacao', path }
    
    
    
    return { status: r.status === 'registrado' ? 'registrado' : 'falha_commit', path }
  }

  
  
  
  try {
    return contaComoPersistido(await deps.persistirNota(input.topicId, input.conteúdo))
      ? { status: 'registrado', path }
      : { status: 'falha_commit', path }
  } catch (err) {
    console.warn('[registrarConhecimento] escrita no Cérebro falhou (fato NÃO gravado):', motivoSeguro(err))
    return { status: 'falha_commit', path }
  }
}
