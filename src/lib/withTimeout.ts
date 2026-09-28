
export class TimeoutError extends Error {
  constructor(label?: string) { super(`timeout${label ? ` (${label})` : ''}`); this.name = 'TimeoutError' }
}


export function withTimeout<T>(p: Promise<T>, ms: number, label?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new TimeoutError(label)), ms)
    p.then(resolve, reject).finally(() => clearTimeout(t))
  })
}
