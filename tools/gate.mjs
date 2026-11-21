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
const win = process.platform === 'win32'

function run(name, cmd, args, cwd = ROOT, after = () => {}) {
  process.stdout.write(`\n== ${name}\n`)
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: win })
  after()
  if (r.status !== 0) {
    process.stderr.write(`\nGATE FAILED: ${name} (exit ${r.status ?? r.signal}). Fix it, or see docs/TEST-STRATEGY.md.\n`)
    process.exit(1)
  }
}

// FF-1: a released version never changes (config.semantic-versioning R3). The marketplace serves
// `main`, so on `main` the built plugin may differ from a released tag only under a new version.
function releasedVersionUnchanged() {
  process.stdout.write('\n== FF-1: a released version is not changed\n')
  const git = (args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', shell: win })
  if (git(['rev-parse', '--git-dir']).status !== 0) { process.stdout.write('not a git checkout: skipped\n'); return }
  const tags = git(['tag', '-l', 'v*']).stdout.trim()
  if (!tags) {
    process.stderr.write('\nGATE FAILED: FF-1 found no release tags. Fetch them (git fetch --tags; in CI fetch-depth: 0).\n')
    process.exit(1)
  }
  const version = JSON.parse(spawnSync(process.execPath, ['-e', 'process.stdout.write(JSON.stringify(require("./package.json").version))'], { cwd: ROOT, encoding: 'utf8' }).stdout)
  const tag = `v${version}`
  if (!tags.split('\n').includes(tag)) { process.stdout.write(`${version} is not released yet: ok\n`); return }
  const d = git(['diff', '--quiet', tag, '--', 'plugins', '.claude-plugin', '.agents'])
  if (d.status !== 0) {
    process.stderr.write(`\nGATE FAILED: FF-1 the built plugin differs from the released ${tag}, under the same version ${version}.\n` +
      'Raise the version and add a CHANGELOG entry (docs/RELEASING.md), or undo the change to plugins/.\n')
    process.exit(1)
  }
  process.stdout.write(`plugins/ equals ${tag}: ok\n`)
}

run('core, CLI and build output tests', process.execPath, ['--test', 'tests/core.test.mjs'])
run('build output is up to date', process.execPath, ['build.mjs', '--check'])
releasedVersionUnchanged()

const probe = spawnSync('claude', ['--version'], { encoding: 'utf8', shell: win })
if (probe.status !== 0) {
  if (withoutClaude) {
    process.stdout.write('\n== mod tests: not run here (--without-claude); they run in CI on Linux\n')
  } else {
    process.stderr.write('\nGATE FAILED: the `claude` CLI is not installed, so the mod tests cannot run.\n' +
      'Install Claude Code, or pass --without-claude to run the rest only.\n')
    process.exit(1)
  }
} else {
  process.stdout.write(`\nclaude ${probe.stdout.trim()}\n`)
  // `claude plugin test` leaves a tsconfig.json in the plugin; it is not part of the build.
  const stray = path.join(PLUGIN, 'tsconfig.json')
  const hadStray = fs.existsSync(stray)
  run('mod tests against the Claude Code engine', 'claude', ['plugin', 'test', '.'], PLUGIN, () => {
    if (!hadStray && fs.existsSync(stray)) fs.rmSync(stray)
  })
  run('plugin manifest is valid', 'claude', ['plugin', 'validate', '.'], PLUGIN)
}
process.stdout.write('\nGATE PASSED\n')
