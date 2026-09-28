
export interface Limiter { run<T>(fn: () => Promise<T>): Promise<T> }


export function createLimiter(max: number): Limiter {
  let active = 0
  const queue: Array<() => void> = []
  const next = () => { active--; const go = queue.shift(); if (go) go() }
  return {
    run<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const start = () => {
          active++
          
          Promise.resolve().then(fn).then(resolve, reject).finally(next)
        }
        if (active < max) start()
        else queue.push(start)
      })
    },
  }
}
