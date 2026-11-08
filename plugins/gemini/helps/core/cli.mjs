#!/usr/bin/env node
// helps on the command line, for Codex and Gemini CLI (and for tests): node cli.mjs <command> …
// The same core as the Claude Code mod; here files are reached through Node.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { run, VERSION } from './core.js'

const SELF = fileURLToPath(import.meta.url)

const io = {
  pathSep: path.delimiter,
  cli: `node "${SELF}"`,
  read: (p) => fs.readFile(p, 'utf8'),
  write: async (p, text) => {
    await fs.mkdir(path.dirname(p), { recursive: true })
    const tmp = `${p}.tmp-${process.pid}`
    await fs.writeFile(tmp, text, 'utf8')
    await fs.rename(tmp, p)
  },
  list: async (p) => (await fs.readdir(p, { withFileTypes: true })).map((d) => ({
    name: d.name,
    kind: d.isSymbolicLink() ? 'other' : d.isDirectory() ? 'dir' : d.isFile() ? 'file' : 'other',
    isLink: d.isSymbolicLink(),
  })),
  exists: async (p) => { try { await fs.lstat(p); return true } catch { return false } },
  stat: async (p, opts) => {
    const st = await fs.stat(p)
    const out = { kind: st.isDirectory() ? 'dir' : st.isFile() ? 'file' : 'other', mtimeMs: st.mtimeMs }
    if (opts && opts.resolve) out.realPath = await fs.realpath(p)
    return out
  },
  env: async (name) => process.env[name],
  now: async () => Date.now(),
}

// `helps link`: put a `helps` command on PATH (Codex and Gemini skills call it by name).
async function link(args) {
  const i = args.indexOf('--dir')
  const dir = i >= 0 ? args[i + 1] : '~/.local/bin'
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const bindir = dir.startsWith('~') ? path.join(home, dir.slice(1)) : dir
  const target = path.join(bindir, process.platform === 'win32' ? 'helps.cmd' : 'helps')
  await fs.mkdir(bindir, { recursive: true })
  if (process.platform === 'win32') {
    await fs.writeFile(target, `@node "${SELF}" %*\r\n`)
  } else {
    let current = null
    try { current = await fs.readlink(target) } catch { /* none */ }
    if (current === SELF) return { code: 0, out: `Already there: ${target} -> ${SELF}` }
    if (current !== null || await io.exists(target)) {
      if (!args.includes('--force')) return { code: 1, err: `${target} already exists. Overwrite with --force` }
      await fs.rm(target)
    }
    await fs.symlink(SELF, target)
    await fs.chmod(SELF, 0o755)
  }
  const onPath = (process.env.PATH || '').split(path.delimiter).includes(bindir)
  return { code: 0, out: `${target} -> ${SELF}` + (onPath ? '' : `\nNote: ${bindir} is not on PATH`) }
}

const args = process.argv.slice(2)
let r
if (args[0] === 'context') {
  // SessionStart hook: the hook's input arrives on stdin and is not needed.
  const i = args.indexOf('--format')
  const format = i >= 0 ? args[i + 1] : 'json'
  r = await run(io, args)
  const text = r.code === 0 ? r.out : ''
  if (r.err) process.stderr.write(r.err + '\n')
  const payload = { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }
  process.stdout.write((format === 'text' ? text : text ? JSON.stringify(payload) : '{}') + '\n')
  process.exit(0)
} else if (args[0] === 'link') {
  r = await link(args.slice(1))
} else if (args[0] === '--version' || args[0] === 'version') {
  r = { code: 0, out: VERSION }
} else {
  r = await run(io, args)
}
if (r.out) process.stdout.write(r.out + '\n')
if (r.err) process.stderr.write(r.err + '\n')
process.exit(r.code)
