


export interface AssocMessage {
  id: string
  role: 'user' | 'assistant'
  
  created_at?: string
}
export interface AssocArtifact {
  id: string
  created_at: string
}


export function associateArtifacts(
  messages: AssocMessage[],
  artifacts: AssocArtifact[],
): Record<string, string | null> {
  const assistants = messages.filter((m) => m.role === 'assistant')
  const lastAssistantId = assistants.length ? assistants[assistants.length - 1].id : null
  const out: Record<string, string | null> = {}
  for (const art of artifacts) {
    let ownerId: string | null = null
    for (const m of assistants) {
      
      
      if (m.created_at && m.created_at >= art.created_at) { ownerId = m.id; break }
    }
    out[art.id] = ownerId ?? lastAssistantId
  }
  return out
}
