















import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'


export const SELF_EXCLUDES = new Set([
  'src/server/awave-stamp.json',
  'src/server/awave-manifest.json',
])


export function isInternalPath(path) {
  const p = String(path).replace(/^\/+/, '')
  if (p === 'CLAUDE.md') return true
  if (p.startsWith('docs/') && p !== 'docs/DEPLOY.md') return true
  if (p.startsWith('.claude/')) return true
  if (p.startsWith('tests/')) return true
  if (/\.internal\./.test(p)) return true
  return false
}


export function isCustomZonePath(path) {
  const p = String(path).replace(/^\/+/, '')
  return p === 'custom' || p.startsWith('custom/')
}


export function isManifestPath(path) {
  return !SELF_EXCLUDES.has(path) && !isInternalPath(path) && !isCustomZonePath(path)
}


export function parseLsTreeZ(out) {
  const entries = []
  for (const entry of out.split('\0')) {
    if (!entry) continue
    const m = entry.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/s)
    if (!m) continue
    entries.push({ sha: m[1], path: m[2] })
  }
  return entries
}


export function buildManifestFiles(entries) {
  const files = {}
  for (const { path, sha } of entries) {
    if (!isManifestPath(path)) continue
    files[path] = sha
  }
  const sorted = {}
  for (const k of Object.keys(files).sort()) sorted[k] = files[k]
  return sorted
}

function main() {
  const ref = (process.argv[2] || '').trim()
  if (!ref) {
    console.error('uso: node scripts/gen-manifest.mjs <ref, ex.: v1.5.0>')
    return 1
  }
  const out = execFileSync('git', ['ls-tree', '-r', '-z', 'HEAD'], { encoding: 'utf8' })
  const files = buildManifestFiles(parseLsTreeZ(out))
  const manifest = { ref, algo: 'git-blob-sha1', files }
  const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'server', 'awave-manifest.json')
  writeFileSync(target, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log(`[gen-manifest] ${Object.keys(files).length} arquivos (entrega) → src/server/awave-manifest.json (ref ${ref})`)
  return 0
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) process.exit(main())
