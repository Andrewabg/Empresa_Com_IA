




export function propostaDeConversaServe(
  propria: { agent_id?: string | null } | null,
  agentId: string,
): boolean {
  
  if (!propria) return false
  
  return !propria.agent_id || propria.agent_id === agentId
}
