#!/usr/bin/env node
// Fitness functions of project/BLUEPRINT.md, section 10 (arch.fitness-functions).
// Each check has a self-test: a broken sample it must reject and a clean one it must accept (R4),
// and fails when it finds nothing to check (R5). Usage: node tools/fitness.mjs
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

// FF-2 (DR-1): the core and the session model reach nothing outside themselves. No imports, no
// require, no Node globals, no engine handle; every effect goes through ctx.io from the wrapper.
const FORBIDDEN = [
  [/^\s*import\b/, 'an import'],
  [/\brequire\s*\(/, 'a require()'],
  [/\bprocess\./, 'the Node process object'],
  [/(^|[^\w$])\$\.[a-z]/, 'the Claude Code engine handle $'],
  [/\b(fetch|XMLHttpRequest|WebSocket)\s*\(/, 'a network call'],
]
function ff2(name, text) {
  const out = []
  text.split('\n').forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '').replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, "''")
    for (const [re, what] of FORBIDDEN) if (re.test(code)) out.push(`${name}:${i + 1}: ${what} (DR-1)`)
  })
  return out
}

// FF-3 (DR-3): helps ships without runtime dependencies.
function ff3(pkgText) {
  const pkg = JSON.parse(pkgText)
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies, ...pkg.peerDependencies })
  return deps.length ? [`package.json: runtime dependencies ${deps.join(', ')} (DR-3)`] : []
}

// FF-6 (ADR-0002): English only. Cyrillic letters in a tracked text file fail the gate.
const CYRILLIC = /[\u0400-\u04FF]/
function ff6(name, text) {
  const out = []
  text.split('\n').forEach((line, i) => { if (CYRILLIC.test(line)) out.push(`${name}:${i + 1}: non-English text (ADR-0002)`) })
  return out
}

function selfTest() {
  const bad = [
    ff2('bad', "import fs from 'node:fs'").length === 1,
    ff2('bad', 'const x = require("fs")').length === 1,
    ff2('bad', 'if (process.env.X) {}').length === 1,
    ff2('bad', 'await $.fs.read(p)').length === 1,
    ff2('bad', 'await fetch(url)').length === 1,
    ff3('{"dependencies":{"left-pad":"1.0.0"}}').length === 1,
    ff6('bad', 'ok\n\u041f\u0440\u0438\u0432\u0435\u0442').length === 1,
  ]
  const good = [
    ff2('good', '// the mod reaches files through $.fs\nconst a = "process.env"\nawait ctx.io.read(p)').length === 0,
    ff3('{"name":"x","devDependencies":{"y":"1"}}').length === 0,
    ff6('good', 'caf\u00e9, na\u00efve, \u2014 \u2192 \u2705').length === 0,
  ]
  return bad.every(Boolean) && good.every(Boolean)
}

const failures = []
if (!selfTest()) failures.push('self-test: a fitness function accepts a broken sample or rejects a clean one')
const files = ['src/core.js', 'src/session.js'].filter((f) => fs.existsSync(path.join(ROOT, f)))
if (files.length !== 2) failures.push('FF-2: found nothing to check (src/core.js, src/session.js)')
for (const f of files) failures.push(...ff2(f, fs.readFileSync(path.join(ROOT, f), 'utf8')))
failures.push(...ff3(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')))

const TEXT = /\.(md|js|mjs|ts|json|yml|yaml|toml|txt)$/
const tracked = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
const textFiles = tracked.status === 0 ? tracked.stdout.split('\n').filter((f) => TEXT.test(f)) : []
if (!textFiles.length) failures.push('FF-6: found no tracked text files to check (is this a git checkout?)')
for (const f of textFiles) {
  if (fs.existsSync(path.join(ROOT, f))) failures.push(...ff6(f, fs.readFileSync(path.join(ROOT, f), 'utf8')))
}

if (failures.length) {
  console.error(failures.join('\n'))
  console.error('Fix the code, or change the rule with an ADR and this check in one pull request (project/BLUEPRINT.md, sections 5 and 10).')
  process.exit(1)
}
console.log(`FF-2, FF-3, FF-6: ok (${files.length} core files, ${textFiles.length} text files; self-test passed)`)
