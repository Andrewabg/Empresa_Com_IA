


export function estourouBudget(spentUsd: number, budgetUsd: number): boolean {
  if (!(budgetUsd > 0)) return false 
  if (!Number.isFinite(spentUsd) || spentUsd < 0) return false 
  return spentUsd >= budgetUsd
}
