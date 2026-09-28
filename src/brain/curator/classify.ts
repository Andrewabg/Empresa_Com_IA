export type Operation = 'create' | 'update' | 'delete' | 'overwrite'

const SENSITIVE_FOLDERS = ['identity/'] 
const MAX_AUTO_TOUCHED = 5

export function classifySensitivity(input: {
  path: string
  operation: Operation
  touched: number
}): 'auto' | 'pr' {
  if (SENSITIVE_FOLDERS.some(f => input.path.startsWith(f))) return 'pr'
  if (input.operation === 'delete' || input.operation === 'overwrite') return 'pr'
  if (input.touched > MAX_AUTO_TOUCHED) return 'pr'
  return 'auto'
}
