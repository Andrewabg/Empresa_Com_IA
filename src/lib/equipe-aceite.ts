
import type { Papel } from '@/lib/equipe'


export interface ConviteReclamado {
  id: string
  papel: Papel
  criado_por: string
}


export type CriacaoDeUsuario =
  | { ok: true; userId: string }
  | { ok: false; codigo?: string; motivo?: string }


export interface PortasDoAceite {
  reclamarConvite(tokenHash: string, agoraIso: string): Promise<ConviteReclamado | null>
  criarUsuario(email: string, senha: string): Promise<CriacaoDeUsuario>
  inserirMembro(entrada: { userId: string; papel: Papel; email: string; convidadoPor: string }): Promise<void>
  finalizarConvite(conviteId: string, userId: string): Promise<void>
  desfazerClaim(conviteId: string): Promise<void>
  apagarUsuario(userId: string): Promise<void>
}


export interface EntradaDoAceite {
  tokenHash: string
  email: string
  senha: string
  
  agoraIso: string
}

export type ResultadoDoAceite = { ok: true; userId: string } | { ok: false; erro: string }



export const ERRO_CONVITE_INVALIDO = 'Convite inválido ou já usado. Peça um novo ao dono.'
export const ERRO_EMAIL_EM_USO = 'Esse e-mail já tem acesso.'
export const ERRO_CRIAR_ACESSO = 'Não foi possível criar o acesso. O link continua valendo.'
export const ERRO_ABRIR_CONVITE =
  'Não foi possível abrir o convite agora. Nada foi feito, e o link continua valendo: tente de novo em alguns minutos.'
export const ERRO_CONCLUIR =
  'Não foi possível concluir o convite. O link continua valendo e o acesso pode já ter sido criado: tente de novo pelo mesmo link e, se disser que o e-mail já tem acesso, peça um convite novo ao dono.'

export const ERRO_CAMPOS_VAZIOS = 'Preencha e-mail e senha.'
export const ERRO_SENHA_LONGA = 'Senha longa demais. Use até 72 caracteres.'

export const AVISO_ENTRE_PELA_TELA =
  'Seu acesso foi criado. Entre com o e-mail e a senha que você acabou de cadastrar.'


async function tentar(etapa: string, acao: () => Promise<void>): Promise<void> {
  try {
    await acao()
  } catch (erro) {
    console.warn(`[aceite] ${etapa} falhou (compensação best-effort):`, erro)
  }
}


export async function aceitarConvite(
  portas: PortasDoAceite,
  entrada: EntradaDoAceite,
): Promise<ResultadoDoAceite> {
  
  let convite: ConviteReclamado | null
  try {
    convite = await portas.reclamarConvite(entrada.tokenHash, entrada.agoraIso)
  } catch (erro) {
    console.warn('[aceite] reclamarConvite falhou:', erro)
    return { ok: false, erro: ERRO_ABRIR_CONVITE }
  }
  if (!convite) return { ok: false, erro: ERRO_CONVITE_INVALIDO }
  
  const conviteReclamado = convite

  
  let criado: CriacaoDeUsuario
  try {
    criado = await portas.criarUsuario(entrada.email, entrada.senha)
  } catch (erro) {
    console.warn('[aceite] criarUsuario falhou:', erro)
    criado = { ok: false }
  }
  if (!criado.ok) {
    
    
    console.warn('[aceite] criarUsuario recusou:', { codigo: criado.codigo, motivo: criado.motivo })
    await tentar('desfazerClaim', () => portas.desfazerClaim(conviteReclamado.id))
    const jaExiste = criado.codigo === 'email_exists' || (criado.motivo ?? '').includes('already')
    return { ok: false, erro: jaExiste ? ERRO_EMAIL_EM_USO : ERRO_CRIAR_ACESSO }
  }
  const usuarioId = criado.userId

  
  
  
  try {
    await portas.inserirMembro({
      userId: usuarioId,
      papel: conviteReclamado.papel,
      email: entrada.email,
      convidadoPor: conviteReclamado.criado_por,
    })
  } catch (erro) {
    console.warn('[aceite] inserirMembro falhou, compensando:', erro)
    await tentar('apagarUsuario', () => portas.apagarUsuario(usuarioId))
    await tentar('desfazerClaim', () => portas.desfazerClaim(conviteReclamado.id))
    return { ok: false, erro: ERRO_CONCLUIR }
  }

  
  await tentar('finalizarConvite', () => portas.finalizarConvite(conviteReclamado.id, usuarioId))

  return { ok: true, userId: usuarioId }
}
