















import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const APPLY = process.argv.includes("--apply");
const MIG_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations");
const OPEN_DOLLAR = /^\$([A-Za-z_]\w*)?\$/;

export function stripSqlComments(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === "'") { 
      out += c; i++;
      while (i < n) {
        const d = src[i]; out += d; i++;
        if (d === "'") { if (src[i] === "'") { out += "'"; i++; continue; } break; }
      }
      continue;
    }
    if (c === "$") { 
      const m = src.slice(i).match(OPEN_DOLLAR);
      if (m) {
        const tag = m[0];
        out += tag; i += tag.length;
        const end = src.indexOf(tag, i);
        if (end === -1) { out += src.slice(i); i = n; }
        else { out += src.slice(i, end) + tag; i = end + tag.length; }
        continue;
      }
    }
    if (c === "-" && src[i + 1] === "-") { 
      let j = i + 2;
      while (j < n && src[j] !== "\n") j++;
      i = j;
      continue;
    }
    out += c; i++;
  }
  return out;
}


function extractLiterals(src) {
  const lits = [];
  let i = 0; const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === "'") {
      const s = i; i++;
      while (i < n) { const d = src[i]; i++; if (d === "'") { if (src[i] === "'") { i++; continue; } break; } }
      lits.push(src.slice(s, i)); continue;
    }
    if (c === "$") {
      const m = src.slice(i).match(OPEN_DOLLAR);
      if (m) { const tag = m[0]; const end = src.indexOf(tag, i + tag.length); const stop = end === -1 ? n : end + tag.length; lits.push(src.slice(i, stop)); i = stop; continue; }
    }
    if (c === "-" && src[i + 1] === "-") { while (i < n && src[i] !== "\n") i++; continue; }
    i++;
  }
  return lits;
}


function verify(orig, stripped) {
  const a = orig.split("\n"), b = stripped.split("\n");
  if (a.length !== b.length) return `LINE COUNT ${a.length} -> ${b.length}`;
  for (let k = 0; k < a.length; k++) {
    if (!a[k].startsWith(b[k])) return `linha ${k + 1}: stripped não é prefixo do original`;
    const removed = a[k].slice(b[k].length);
    if (removed !== "" && !removed.startsWith("--")) return `linha ${k + 1}: removeu não-comentário >>>${removed.slice(0, 50)}<<<`;
  }
  const la = extractLiterals(orig), lb = extractLiterals(stripped);
  if (la.length !== lb.length) return `LITERAL COUNT ${la.length} -> ${lb.length}`;
  for (let k = 0; k < la.length; k++) if (la[k] !== lb[k]) return `LITERAL #${k} mudou`;
  if (stripSqlComments(stripped) !== stripped) return `NÃO idempotente`;
  return null;
}


const T = [
  ["select 1; -- c", "select 1; "],
  ["a\n-- full line\nb", "a\n\nb"],
  ["x '-- not comment' y -- real", "x '-- not comment' y "],
  ["$$ body -- keep $$", "$$ body -- keep $$"],
  ["'it''s -- ok'", "'it''s -- ok'"],
  ["default '{}', -- [{origem:'op'}]", "default '{}', "],
  ["$$\n-- inside\nreturn;\n$$ -- gone", "$$\n-- inside\nreturn;\n$$ "],
  ["no comment here", "no comment here"],
];
let tf = 0;
for (const [inp, exp] of T) {
  const got = stripSqlComments(inp);
  if (got !== exp) { tf++; console.log(`UNIT FAIL:\n  in:  ${JSON.stringify(inp)}\n  exp: ${JSON.stringify(exp)}\n  got: ${JSON.stringify(got)}`); }
}
if (tf) { console.log(`\n${tf} unit tests FALHARAM — abortando, nenhum arquivo tocado.`); process.exit(1); }
console.log(`unit tests: ${T.length}/${T.length} pass`);


const files = readdirSync(MIG_DIR).filter((f) => f.endsWith(".sql")).sort();
let totalRemoved = 0, changedFiles = 0;
const failures = [];
for (const f of files) {
  const p = join(MIG_DIR, f);
  const orig = readFileSync(p, "utf8");
  const stripped = stripSqlComments(orig);
  const err = verify(orig, stripped);
  if (err) { failures.push(`${f}: ${err}`); continue; }
  if (stripped !== orig) {
    changedFiles++;
    totalRemoved += (orig.length - stripped.length);
    if (APPLY) writeFileSync(p, stripped, "utf8");
  }
}
console.log(`\n=== SQL comment strip ${APPLY ? "(APPLIED)" : "(DRY-RUN)"} ===`);
console.log(`migrations: ${files.length} · changed: ${changedFiles} · bytes removidos: ${totalRemoved} · FALHAS: ${failures.length}`);
for (const x of failures) console.log("   x " + x);
if (failures.length) { console.log("\nFALHAS presentes — abortado."); process.exit(1); }
console.log(APPLY ? "aplicado limpo." : "dry-run limpo. Rode com --apply pra escrever.");
