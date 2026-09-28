





export function isSafeNotePath(p: unknown): p is string {
  if (typeof p !== 'string') return false
  if (p.length === 0 || p.length > 400) return false
  if (p.includes('\0')) return false          
  if (p.includes('\\')) return false           
  if (p.startsWith('/')) return false          
  if (/^[a-zA-Z]:/.test(p)) return false        
  
  const segs = p.split('/')
  if (segs.some((s) => s === '..')) return false
  if (segs.some((s) => s.trim() === '')) return false 
  return true
}
