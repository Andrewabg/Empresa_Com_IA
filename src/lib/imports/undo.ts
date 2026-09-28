



export function canUndo(status: string, shaCount: number): boolean {
  return shaCount > 0 && status !== 'undone'
}


export function revertOrder(shas: string[]): string[] {
  return [...shas].reverse()
}
