#!/usr/bin/env node
// The gate: the same checks locally and in CI (quality.quality-release R5, R6).
// Usage: node tools/gate.mjs [--without-claude]
// Without the flag, a missing `claude` CLI fails the gate instead of skipping the mod tests silently.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const PLUGIN = path.join(ROOT, 'plugins', 'claude', 'helps')
const withoutClaude = process.argv.includes('--without-claude')
// `claude` is a .cmd shim on Windows and needs a shell there; node and git never do (and a shell would
// break a path with spaces such as C:\Program Files\nodejs\node.exe).
const CLAUDE = { shell: process.platform === 'win32' }

function run(name, cmd, args, { cwd = ROOT, shell = false, after = () => {} } = {}) {
  process.stdout.write(`\n== ${name}\n`)
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell })
  after()
  if (r.status !== 0) {
    const why = r.error ? r.error.message : r.signal ? `signal ${r.signal}` : `exit ${r.status}`
    process.stderr.write(`\nGATE FAILED: ${name} (${why}). Fix it, or see project/TEST-STRATEGY.md.\n`)
    process.exit(1)
  }
}

run('core, CLI and build output tests', process.execPath, ['--test', 'tests/core.test.mjs'])
run('FF-5: build output is up to date', process.execPath, ['build.mjs', '--check'])
run('FF-1, FF-2, FF-3, FF-6, FF-7: released versions, dependency rules, no Cyrillic, approved releases', process.execPath, ['tools/fitness.mjs'])

const probe = spawnSync('claude', ['--version'], { encoding: 'utf8', ...CLAUDE })
if (probe.status !== 0) {
  if (withoutClaude) {
    process.stdout.write('\n== FF-4 mod tests: not run here (--without-claude); they run in CI on Linux\n')
  } else {
    process.stderr.write('\nGATE FAILED: the `claude` CLI is not installed, so the mod tests (FF-4) cannot run.\n' +
      'Install Claude Code, or pass --without-claude to run the rest only.\n')
    process.exit(1)
  }
} else {
  process.stdout.write(`\nclaude ${probe.stdout.trim()}\n`)
  // `claude plugin test` leaves a tsconfig.json in the plugin; it is not part of the build.
  const stray = path.join(PLUGIN, 'tsconfig.json')
  const hadStray = fs.existsSync(stray)
  run('FF-4: mod tests against the Claude Code engine', 'claude', ['plugin', 'test', '.'], {
    cwd: PLUGIN, ...CLAUDE, after: () => { if (!hadStray && fs.existsSync(stray)) fs.rmSync(stray) },
  })
  run('plugin manifest is valid', 'claude', ['plugin', 'validate', '.'], { cwd: PLUGIN, ...CLAUDE })
}
process.stdout.write('\nGATE PASSED\n')
