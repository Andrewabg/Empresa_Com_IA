





export function agenteDaConversa(
  conversaAgentId: string | null | undefined,
  canalAgentId: string,
): string {
  const daConversa = (conversaAgentId ?? '').trim()
  return daConversa.length > 0 ? daConversa : canalAgentId
}
