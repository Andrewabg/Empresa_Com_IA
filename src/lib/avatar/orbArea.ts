




export function waveAreaPath(strokePath: string, width: number, height: number): string {
  return `${strokePath} L${width.toFixed(2)} ${height.toFixed(2)} L0.00 ${height.toFixed(2)} Z`
}
