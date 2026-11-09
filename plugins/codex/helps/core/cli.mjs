#!/usr/bin/env node
// helps on the command line, for Codex and Gemini CLI (and for tests): node cli.mjs <command> …
// The same core as the Claude Code mod; here files are reached through Node.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { webcrypto } from 'node:crypto'
import { run, VERSION } from './core.js'

// The core hashes with the web crypto API; Node 18 has it but not as a global.
if (!globalThis.crypto) globalThis.crypto = webcrypto

const SELF = fileURLToPath(import.meta.url)

const io = {
  pathSep: path.delimiter,
  cli: `node "${SELF}"`,
  read: (p) => fs.readFile(p, 'utf8'),
  // Whole-file replace through a temporary file, so a crash never leaves half a file. A link is
  // written through, and the file keeps its permissions.
  write: async (p, text) => {
    await fs.mkdir(path.dirname(p), { recursive: true })
    let target = p
    let mode
    try { target = await fs.realpath(p); mode = (await fs.stat(target)).mode & 0o777 } catch { /* a new file */ }
    const tmp = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`)
    try {
      await fs.writeFile(tmp, text, { encoding: 'utf8', mode: mode ?? 0o644, flag: 'wx' })
      await fs.rename(tmp, target)
    } catch (err) {
      await fs.rm(tmp, { force: true })
      throw err
    }
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
  cwd: async () => process.cwd(),
}

// `helps link`: put a `helps` command on PATH (Codex and Gemini skills call it by name).
async function link(args) {
  const i = args.indexOf('--dir')
  const dir = i >= 0 ? args[i + 1] : '~/.local/bin'
  if (!dir) return { code: 2, err: 'helps: --dir needs a folder' }
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const bindir = dir.startsWith('~') ? path.join(home, dir.slice(1)) : dir
  const target = path.join(bindir, process.platform === 'win32' ? 'helps.cmd' : 'helps')
  await fs.mkdir(bindir, { recursive: true })
  if (process.platform === 'win32') {
    const line = `@node "${SELF}" %*\r\n`
    let current = null
    try { current = await fs.readFile(target, 'utf8') } catch { /* none */ }
    if (current === line) return { code: 0, out: `Already there: ${target}` }
    if (current !== null && !args.includes('--force')) return { code: 1, err: `${target} already exists. Overwrite with --force` }
    await fs.writeFile(target, line)
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
