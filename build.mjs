#!/usr/bin/env node
// Builds the three plugin wrappers from one source (src/).
//
//   node build.mjs          rebuild plugins/ and the marketplaces
//   node build.mjs --check  check that plugins/ matches a fresh build (tests and CI)
//
// Each wrapper is self-contained and carries its own copy of the core, because Claude Code,
// Codex and Gemini CLI copy only the plugin folder when they install it.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ASK, VERSION } from './src/core.js'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(ROOT, 'src')

const NAME = 'helps'
const DESCRIPTION = 'An assistant that keeps one main thing, saves everything else for later and goes through ' +
  'waiting decisions with you, with buttons and plain words.'
const AUTHOR = { name: 'uaskpro' }
const REPO = 'https://github.com/uaskpro/helps'
const SKILLS = ['setup', 'focus', 'idea', 'decide', 'review']

const FALLBACK_PATH = '\nIf there is no `helps` command on PATH, call the core by the path given in the `[helps]` ' +
  'block at the start of the session: `node "<path>/cli.mjs" …`, or run `node "<path>/cli.mjs" link` once.\n'

const AGENT_CFG = {
  claude: {
    helps: 'helps',
    fallback: '\nHere `helps …` is not a terminal command: call the `mcp__helps__run` tool with everything after ' +
      'the word helps in `args`, word by word, for example `{"args": ["idea", "<gist>", "--by", "claude"]}`. ' +
      'If there is no such tool (plain claude.ai chat or the phone), do not pretend you saved anything. Say in ' +
      'one sentence that the assistant keeps the main thing and the notes on the computer and fully works in ' +
      'Claude Code, and help with words here.\n',
  },
  codex: { helps: 'helps', fallback: FALLBACK_PATH },
  gemini: { helps: 'helps', fallback: FALLBACK_PATH },
}

const GEMINI_COMMANDS = {
  setup: ['Set up the assistant in a minute', 'Use the setup skill: set up the assistant with me.'],
  focus: ['What is the main thing now', 'Use the focus skill: show me the main thing now.'],
  idea: ['Save for later', 'Use the idea skill and save this for later: {{args}}'],
  decide: ['Go through waiting decisions', 'Use the decide skill: let us go through the decisions one by one.'],
  review: ['Go through what was saved for later', 'Use the review skill: let us go through what was saved for later.'],
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text)
}
const dump = (file, data) => write(file, JSON.stringify(data, null, 2) + '\n')
const copy = (from, to) => write(to, fs.readFileSync(path.join(SRC, from)))

function sessionHook(command, matcher = '', extra = {}) {
  const group = { ...(matcher ? { matcher } : {}), hooks: [{ type: 'command', command, ...extra }] }
  return { hooks: { SessionStart: [group] } }
}

function common(dest, agent) {
  const cfg = AGENT_CFG[agent]
  for (const skill of SKILLS) {
    let body = fs.readFileSync(path.join(SRC, 'skills', skill, 'SKILL.md'), 'utf8')
    body = body.replaceAll('{{HELPS}}', cfg.helps).replaceAll('{{AGENT}}', agent).replaceAll('{{ASK}}', ASK[agent])
    body = body.replaceAll('{{FALLBACK}}\n', cfg.fallback).replaceAll('{{FALLBACK}}', cfg.fallback)
    write(path.join(dest, 'skills', skill, 'SKILL.md'), body)
  }
  if (agent !== 'claude') { // Claude runs the core inside the mod; the others through Node
    copy('core.js', path.join(dest, 'core', 'core.js'))
    copy('cli.mjs', path.join(dest, 'core', 'cli.mjs'))
    fs.chmodSync(path.join(dest, 'core', 'cli.mjs'), 0o755)
  }
}

const manifest = () => ({ name: NAME, version: VERSION, description: DESCRIPTION, author: AUTHOR,
  repository: REPO, license: 'UNLICENSED' })

function buildClaude(out) {
  const dest = path.join(out, 'claude', NAME)
  common(dest, 'claude')
  dump(path.join(dest, '.claude-plugin', 'plugin.json'), manifest())
  dump(path.join(dest, 'hooks', 'hooks.json'), { modules: ['./register.js'] })
  copy('register.js', path.join(dest, 'hooks', 'register.js'))
  copy('core.js', path.join(dest, 'hooks', 'core.js'))
  copy('mod.test.ts', path.join(dest, 'tests', 'mod.test.ts')) // claude plugin test
}

function buildCodex(out) {
  const dest = path.join(out, 'codex', NAME)
  common(dest, 'codex')
  dump(path.join(dest, '.codex-plugin', 'plugin.json'), manifest())
  dump(path.join(dest, 'hooks', 'hooks.json'), sessionHook(
    'node "${PLUGIN_ROOT}/core/cli.mjs" context --agent codex', '', { timeout: 10, statusMessage: 'helps: main thing' }))
}

function buildGemini(out) {
  const dest = path.join(out, 'gemini', NAME)
  common(dest, 'gemini')
  dump(path.join(dest, 'gemini-extension.json'), { name: NAME, version: VERSION, description: DESCRIPTION })
  dump(path.join(dest, 'hooks', 'hooks.json'), sessionHook(
    'node "${extensionPath}${/}core${/}cli.mjs" context --agent gemini', '*', { name: 'helps-focus', timeout: 10000 }))
  for (const [cmd, [desc, prompt]] of Object.entries(GEMINI_COMMANDS)) {
    write(path.join(dest, 'commands', NAME, `${cmd}.toml`),
      `description = ${JSON.stringify(desc)}\nprompt = """\n${prompt}\n"""\n`)
  }
}

function buildMarketplaces(root) {
  dump(path.join(root, '.claude-plugin', 'marketplace.json'), {
    name: 'uaskpro-helps',
    owner: AUTHOR,
    description: 'The helps plugin for Claude Code',
    plugins: [{ name: NAME, source: './plugins/claude/helps', description: DESCRIPTION }],
  })
  dump(path.join(root, '.agents', 'plugins', 'marketplace.json'), {
    name: 'uaskpro-helps',
    interface: { displayName: 'uaskpro helps' },
    plugins: [{
      name: NAME,
      source: { source: 'local', path: './plugins/codex/helps' },
      policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
      category: 'Productivity',
    }],
  })
}

function build(root) {
  const out = path.join(root, 'plugins')
  fs.rmSync(out, { recursive: true, force: true })
  buildClaude(out)
  buildCodex(out)
  buildGemini(out)
  buildMarketplaces(root)
}

function snapshot(root) {
  const files = new Map()
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (ent.isFile()) files.set(path.relative(root, p), fs.readFileSync(p).toString('base64'))
    }
  }
  for (const base of ['plugins', '.claude-plugin', '.agents']) walk(path.join(root, base))
  return files
}

if (process.argv.includes('--check')) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helps-build-'))
  try {
    build(tmp)
    const want = snapshot(tmp)
    const have = snapshot(ROOT)
    for (const k of have.keys()) if (k.includes(`${path.sep}types${path.sep}`)) have.delete(k) // engine-written types
    const diff = [...new Set([...want.keys(), ...have.keys()])].filter((k) => want.get(k) !== have.get(k)).sort()
    if (diff.length) {
      console.log('plugins/ is out of date, run node build.mjs:\n  ' + diff.join('\n  '))
      process.exit(1)
    }
    console.log('plugins/ matches the build')
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
} else {
  build(ROOT)
  console.log(`built helps ${VERSION} → plugins/claude, plugins/codex, plugins/gemini`)
}
