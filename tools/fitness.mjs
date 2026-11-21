#!/usr/bin/env node
// Fitness functions of project/BLUEPRINT.md, section 10 (arch.fitness-functions): FF-1, FF-2, FF-3, FF-6.
// Each has a self-test (a broken sample it must reject, a clean one it must accept; R4) and fails when it
// finds nothing to check (R5). Usage: node tools/fitness.mjs
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

// FF-1 (NFR-12, ADR-0007): a released version never changes. The marketplace serves `main`, so the
// built plugin may differ from the tag of the current version only under a new version.
function ff1({ isGit, tags, version, sameAsTag }) {
  if (!isGit) return ['FF-1: not a git checkout, so released versions cannot be compared (run the gate in a clone)']
  if (!tags.length) return ['FF-1: no release tags found; fetch them (git fetch --tags; in CI fetch-depth: 0)']
  if (!tags.includes(`v${version}`)) return []
  return sameAsTag ? [] : [`FF-1: the built plugin differs from the released v${version} under the same version; ` +
    'raise the version (project/RELEASING.md) or undo the change to plugins/']
}

// FF-2 (DR-1, DR-2): the core and the session model reach nothing outside themselves. No imports (static or
// dynamic), no require, no Node-only globals, no timers, no engine handle `$`, no network. Web-standard
// globals (Date, crypto.subtle, TextEncoder, Intl) are allowed.
const FORBIDDEN = [
  [/^\s*import\b|\bimport\s*\(/, 'an import'],
  [/\brequire\s*\(/, 'a require()'],
  [/\b(process|Buffer|global|globalThis|__dirname|__filename|module|exports)\b/, 'a Node global'],
  [/\b(setTimeout|setInterval|setImmediate|queueMicrotask)\s*\(/, 'a timer'],
  [/(^|[^\w$])\$\.[a-z]/, 'the Claude Code engine handle $'],
  [/\b(fetch|XMLHttpRequest|WebSocket|EventSource)\b/, 'a network call'],
]
function ff2(name, text) {
  const out = []
  text.split('\n').forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '').replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, "''")
    for (const [re, what] of FORBIDDEN) if (re.test(code)) out.push(`FF-2: ${name}:${i + 1}: ${what} (DR-1)`)
  })
  return out
}

// FF-3 (DR-3): helps ships without runtime dependencies.
function ff3(pkgText) {
  const pkg = JSON.parse(pkgText)
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies, ...pkg.peerDependencies })
  return deps.length ? [`FF-3: package.json has runtime dependencies: ${deps.join(', ')} (DR-3)`] : []
}

// FF-6 (ADR-0002): no Cyrillic text in tracked text files. It catches the language the project is most
// likely to leak; other languages are left to review.
const CYRILLIC = /[\u0400-\u04ff]/
function ff6(name, text) {
  const out = []
  text.split('\n').forEach((line, i) => { if (CYRILLIC.test(line)) out.push(`FF-6: ${name}:${i + 1}: Cyrillic text (ADR-0002)`) })
  return out
}

function selfTest() {
  const one = (x) => x.length === 1
  const none = (x) => x.length === 0
  return [
    one(ff1({ isGit: false, tags: ['v1.0.0'], version: '1.0.0', sameAsTag: true })),
    one(ff1({ isGit: true, tags: [], version: '1.0.0', sameAsTag: true })),
    one(ff1({ isGit: true, tags: ['v1.0.0'], version: '1.0.0', sameAsTag: false })),
    none(ff1({ isGit: true, tags: ['v1.0.0'], version: '1.0.0', sameAsTag: true })),
    none(ff1({ isGit: true, tags: ['v1.0.0'], version: '1.1.0', sameAsTag: false })),
    one(ff2('bad', "import fs from 'node:fs'")),
    one(ff2('bad', "const fs = await import('node:fs')")),
    one(ff2('bad', 'const x = require("fs")')),
    one(ff2('bad', 'if (process.env.X) {}')),
    one(ff2('bad', 'const b = Buffer.from(s)')),
    one(ff2('bad', 'setTimeout(f, 10)')),
    one(ff2('bad', 'await $.fs.read(p)')),
    one(ff2('bad', 'await fetch(url)')),
    none(ff2('good', '// the mod reaches files through $.fs\nconst a = "process.env"\nawait ctx.io.read(p)\nnew Date(ms); crypto.subtle')),
    one(ff3('{"dependencies":{"left-pad":"1.0.0"}}')),
    none(ff3('{"name":"x","devDependencies":{"y":"1"}}')),
    one(ff6('bad', 'ok\n\u041f\u0440\u0438\u0432\u0435\u0442')),
    none(ff6('good', 'caf\u00e9, na\u00efve, — → \u2705')),
  ].every(Boolean)
}

const failures = []
if (!selfTest()) failures.push('self-test: a fitness function accepts a broken sample or rejects a clean one')

const git = (args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
const isGit = git(['rev-parse', '--git-dir']).status === 0
const tags = isGit ? git(['tag', '-l', 'v*']).stdout.split('\n').filter(Boolean) : []
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version
const sameAsTag = isGit && tags.includes(`v${version}`) &&
  git(['diff', '--quiet', `v${version}`, '--', 'plugins', '.claude-plugin', '.agents']).status === 0
failures.push(...ff1({ isGit, tags, version, sameAsTag }))

const core = ['src/core.js', 'src/session.js'].filter((f) => fs.existsSync(path.join(ROOT, f)))
if (core.length !== 2) failures.push('FF-2: found nothing to check (src/core.js, src/session.js)')
for (const f of core) failures.push(...ff2(f, fs.readFileSync(path.join(ROOT, f), 'utf8')))
failures.push(...ff3(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')))

const TEXT = /\.(md|js|mjs|cjs|ts|json|yml|yaml|toml|txt|sh|html|css)$/
const text = isGit ? git(['ls-files']).stdout.split('\n').filter((f) => TEXT.test(f)) : []
if (!text.length) failures.push('FF-6: found no tracked text files to check')
for (const f of text) if (fs.existsSync(path.join(ROOT, f))) failures.push(...ff6(f, fs.readFileSync(path.join(ROOT, f), 'utf8')))

if (failures.length) {
  console.error(failures.join('\n'))
  console.error('Fix the code, or change the rule with an ADR and this check in one pull request (project/BLUEPRINT.md, sections 5 and 10).')
  process.exit(1)
}
console.log(`FF-1: ${tags.includes(`v${version}`) ? `plugins/ equals v${version}` : `${version} not released yet`}; ` +
  `FF-2, FF-3: ${core.length} core files; FF-6: ${text.length} text files; self-tests passed`)
