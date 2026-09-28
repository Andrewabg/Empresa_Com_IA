import { serverDb } from '@/server/supabase'
import type { Papel } from '@/lib/equipe'

export type MembroRow = {
  user_id: string
  papel: Papel
  email: string | null
  convidado_por: string | null
  created_at: string
}


export async function papelDoUsuario(userId: string): Promise<Papel | null> {
  const { data, error } = await serverDb().rpc('papel_do_membro', { p_uid: userId })
  if (error) throw new Error(`[equipe] papelDoUsuario: ${error.message}`)
  return (data as Papel | null) ?? null
}

export async function listarMembros(): Promise<MembroRow[]> {
  const { data, error } = await serverDb()
    .from('equipe_membros')
    .select('user_id, papel, email, convidado_por, created_at')
    .order('created_at', { ascending: true })
  if (error) throw new Error(`[equipe] listarMembros: ${error.message}`)
  return (data ?? []) as MembroRow[]
}

export async function contarDonos(): Promise<number> {
  const { count, error } = await serverDb()
    .from('equipe_membros').select('user_id', { count: 'exact', head: true }).eq('papel', 'dono')
  if (error) throw new Error(`[equipe] contarDonos: ${error.message}`)
  return count ?? 0
}

export async function criarConvite(input: {
  tokenHash: string; papel: Papel; criadoPor: string; expiraEm: string; rotulo?: string | null
}): Promise<void> {
  const { error } = await serverDb().from('equipe_convites').insert({
    token_hash: input.tokenHash, papel: input.papel,
    criado_por: input.criadoPor, expira_em: input.expiraEm,
    rotulo: input.rotulo ?? null,
  })
  if (error) throw new Error(`[equipe] criarConvite: ${error.message}`)
}

export type ConvitePendente = {
  id: string; papel: Papel; rotulo: string | null; created_at: string; expira_em: string
}


export async function listarConvitesPendentes(): Promise<ConvitePendente[]> {
  const { data, error } = await serverDb()
    .from('equipe_convites')
    .select('id, papel, rotulo, created_at, expira_em')
    .is('aceito_em', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`[equipe] listarConvitesPendentes: ${error.message}`)
  return (data ?? []) as ConvitePendente[]
}


export async function cancelarConvite(conviteId: string): Promise<boolean> {
  const { data, error } = await serverDb()
    .from('equipe_convites')
    .delete()
    .eq('id', conviteId)
    .is('aceito_em', null)
    .select('id')
  if (error) throw new Error(`[equipe] cancelarConvite: ${error.message}`)
  return (data?.length ?? 0) > 0
}



export type { ConviteReclamado } from '@/lib/equipe-aceite'
import type { ConviteReclamado } from '@/lib/equipe-aceite'


export async function reclamarConvite(tokenHash: string, nowIso: string): Promise<ConviteReclamado | null> {
  const { data, error } = await serverDb()
    .from('equipe_convites')
    .update({ aceito_em: nowIso })
    .eq('token_hash', tokenHash)
    .is('aceito_em', null)
    .gt('expira_em', nowIso)
    .select('id, papel, criado_por')
    .maybeSingle()
  if (error) throw new Error(`[equipe] reclamarConvite: ${error.message}`)
  return (data as ConviteReclamado | null) ?? null
}


export async function desfazerClaim(conviteId: string): Promise<void> {
  await serverDb().from('equipe_convites').update({ aceito_em: null }).eq('id', conviteId)
}


export async function finalizarConvite(conviteId: string, aceitoPor: string): Promise<void> {
  await serverDb().from('equipe_convites').update({ aceito_por: aceitoPor }).eq('id', conviteId)
}

export async function inserirMembro(input: {
  userId: string; papel: Papel; email: string | null; convidadoPor: string
}): Promise<void> {
  const { error } = await serverDb().from('equipe_membros').insert({
    user_id: input.userId, papel: input.papel, email: input.email, convidado_por: input.convidadoPor,
  })
  if (error) throw new Error(`[equipe] inserirMembro: ${error.message}`)
}


export async function setPapel(userId: string, papel: Papel): Promise<boolean> {
  const { data, error } = await serverDb().rpc('equipe_set_papel', { p_uid: userId, p_papel: papel })
  if (error) throw new Error(`[equipe] setPapel: ${error.message}`)
  return (data as number) > 0
}


export async function definirSenhaDeMembro(userId: string, senha: string): Promise<boolean> {
  const { data: membro, error: erroBusca } = await serverDb()
    .from('equipe_membros').select('user_id').eq('user_id', userId).maybeSingle()
  if (erroBusca) throw new Error(`[equipe] definirSenhaDeMembro: ${erroBusca.message}`)
  if (!membro) return false
  const { error } = await serverDb().auth.admin.updateUserById(userId, { password: senha })
  if (error) throw new Error(`[equipe] definirSenhaDeMembro: ${error.message}`)
  return true
}


export async function revogarMembro(userId: string): Promise<boolean> {
  const { data, error } = await serverDb().rpc('equipe_revogar', { p_uid: userId })
  if (error) throw new Error(`[equipe] revogarMembro: ${error.message}`)
  return (data as number) > 0
}
