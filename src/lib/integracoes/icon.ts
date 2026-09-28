

export function isIconUrl(icon: string): boolean {
  return /^(https?:)?\/\//.test(icon) || icon.startsWith('/')
}
