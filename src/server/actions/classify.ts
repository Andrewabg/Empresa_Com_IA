
export type ActionKind = 'read' | 'write'








const READ_VERBS = [
  'GET', 'LIST', 'FETCH', 'SEARCH', 'FIND', 'READ', 'RETRIEVE', 'CHECK', 'COUNT',
  'QUERY', 'VIEW', 'DESCRIBE', 'SHOW', 'LOOKUP', 'EXPORT', 'DOWNLOAD',
]














const WRITE_VERBS = [
  'CREATE', 'DELETE', 'SEND', 'UPDATE', 'POST', 'PUT', 'PATCH', 'REPLACE', 'REMOVE', 'ADD',
  'SET', 'EXECUTE', 'MOVE', 'INSERT', 'UPSERT', 'WRITE', 'MODIFY', 'CANCEL', 'ARCHIVE', 'MERGE',
  'APPROVE', 'REJECT', 'ASSIGN', 'INVITE', 'PUBLISH', 'UPLOAD', 'DUPLICATE', 'CLONE', 'ENABLE', 'DISABLE',
  
  'MARK', 'CLOSE', 'COMMENT', 'REPLY', 'COMPLETE', 'SUBMIT', 'SNOOZE', 'MUTE', 'UNMUTE',
  'PIN', 'UNPIN', 'LOCK', 'UNLOCK', 'JOIN', 'LEAVE', 'RESTORE', 'TRASH', 'TRANSITION', 'ACK',
  'SUBSCRIBE', 'UNSUBSCRIBE', 'TRIGGER', 'SCHEDULE', 'REFUND', 'APPEND', 'STAR', 'UNSTAR', 'WATCH', 'UNWATCH',
]





const CONJUNCTIONS = ['AND', 'OR']

export function classifyAction(slug: string, tags?: string[]): ActionKind {
  const tokens = String(slug ?? '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean)
  if (tokens.length === 0) return 'write'
  
  
  if (tokens.some((t) => WRITE_VERBS.includes(t))) return 'write'
  const slugSaysRead = tokens.some((t) => READ_VERBS.includes(t))
  
  
  
  
  
  
  
  
  if (slugSaysRead) {
    for (let i = 0; i + 1 < tokens.length; i++) {
      if (READ_VERBS.includes(tokens[i]) && CONJUNCTIONS.includes(tokens[i + 1])) {
        const next = tokens.slice(i + 2).find((t) => !CONJUNCTIONS.includes(t)) 
        if (next && !READ_VERBS.includes(next)) return 'write'
      }
    }
  }
  
  const tagSet = new Set((tags ?? []).map((t) => t.toLowerCase()))
  const tagSaysRead = tagSet.has('readonly') || tagSet.has('read-only') || tagSet.has('read_only')
  return slugSaysRead || tagSaysRead ? 'read' : 'write'
}
