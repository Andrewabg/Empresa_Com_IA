

export type BudgetParse =
  | { ok: true; value: number }
  | { ok: false; error: string }


function money(n: number): number {
  return Math.round(n * 100) / 100
}


export function parseBudgetInput(raw: string): BudgetParse {
  const trimmed = (raw ?? '').trim()
  if (trimmed === '') return { ok: true, value: 0 } 

  
  const stripped = trimmed.replace(/[R$\s]/gi, '')
  if (stripped === '') return { ok: false, error: 'Valor inválido.' }

  
  
  
  
  
  
  let normalized: string
  if (stripped.includes('.') && stripped.includes(',')) {
    normalized = stripped.replace(/\./g, '').replace(',', '.')
  } else if (stripped.includes(',')) {
    normalized = stripped.replace(',', '.')
  } else if (stripped.includes('.')) {
    const dots = stripped.split('.').length - 1
    const milhar = dots >= 2 || /\.\d{3}$/.test(stripped)
    normalized = milhar ? stripped.replace(/\./g, '') : stripped
  } else {
    normalized = stripped
  }

  
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return { ok: false, error: 'Digite um número (ex.: 50 ou 100).' }
  }

  const value = Number(normalized)
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, error: 'Valor inválido.' }
  }

  return { ok: true, value: money(value) }
}
