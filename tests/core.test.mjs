// Tests of the core (through the CLI) and of the built wrappers: npm testcore.test.mjs
import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CLI = path.join(ROOT, 'src', 'cli.mjs')

const STATE = `# STATE — 2026-11-08

**Goal:** start selling.

## In progress
- gates

## Waiting for owner
1. **Option A/B/C.** A is recommended.
   Second line of the item.
2. Price and payment method.

### Details
- a nested item belongs to the owner too

## Done
- not a decision
`

let base, data, projects
const TODAY = '2026-11-10'

beforeEach(() => {
  base = fs.mkdtempSync(path.join(os.tmpdir(), 'helps-test-'))
  data = path.join(base, 'helps-data')
  projects = path.join(base, 'projects')
})
afterEach(() => fs.rmSync(base, { recursive: true, force: true }))

function core(args, { today = TODAY, stdin = '' } = {}) {
  const env = { ...process.env, HELPS_DATA: data, HELPS_TODAY: today, HELPS_NOW: '2026-11-10 09:00',
    HELPS_PROJECT_ROOTS: projects }
  return spawnSync(process.execPath, [CLI, ...args], { input: stdin, env, encoding: 'utf8', timeout: 30000 })
}

function ok(args, opts) {
  const r = core(args, opts)
  assert.equal(r.status, 0, r.stderr)
  return r.stdout
}

const json = (args, opts) => JSON.parse(ok(args, opts))

function ctx(agent = 'claude', today) {
  const out = JSON.parse(ok(['context', '--agent', agent], { stdin: '{}', today }))
  return out.hookSpecificOutput ? out.hookSpecificOutput.additionalContext : ''
}

function makeProject(name = 'SHOP', state = STATE) {
  const dir = path.join(projects, name)
  fs.mkdirSync(dir, { recursive: true })
  if (state !== null) fs.writeFileSync(path.join(dir, 'STATE.md'), state)
  else fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# x\n')
  return dir
}

const setupFocus = (...extra) => json(['setup', '--project', 'evolution', '--finish', 'theme listed on opencart.com',
  '--allow', 'clients', ...extra], { today: '2026-11-08' })

// ----------------------------------------------------------------- context

test('not set up: offers setup with buttons', () => {
  const text = ctx('claude')
  assert.match(text, /not set up/)
  assert.match(text, /Set up now/)
  assert.match(text, /AskUserQuestion/)
  assert.match(text, /mcp__helps__run/)
  assert.doesNotMatch(ctx('codex'), /AskUserQuestion/)
})

test('set up: the main thing and the way out', () => {
  setupFocus()
  const text = ctx('codex')
  assert.match(text, /The person's main thing: evolution/)
  assert.match(text, /theme listed on opencart\.com/)
  assert.match(text, /Day 2\./)
  assert.match(text, /--by codex/)
  assert.match(text, /cli\.mjs/)
  assert.match(text, /This matters more, do it now/)
  assert.match(text, /clients/)
  assert.match(text, /Do not say "focus"/)
  assert.match(ctx('claude'), /"--by", "claude"/)
})

test('decisions are offered once a day', () => {
  makeProject()
  setupFocus('--sources-from-scan')
  assert.match(ctx(), /Decisions waiting for the person: 3/)
  assert.doesNotMatch(ctx(), /Decisions waiting/)
  assert.match(ctx('claude', '2026-11-11'), /Decisions waiting for the person: 3/)
})

test('a review is offered after a week', () => {
  setupFocus()
  ok(['idea', 'portal', '--by', 'claude'])
  assert.match(ctx(), /Look at saved items/)
  ok(['reviewed'], { today: '2026-11-11' })
  assert.doesNotMatch(ctx('claude', '2026-11-12'), /Look at saved items/)
  assert.match(ctx('claude', '2026-11-18'), /Look at saved items/)
})

test('the session start survives broken data', () => {
  fs.mkdirSync(data, { recursive: true })
  fs.writeFileSync(path.join(data, 'FOCUS.md'), Buffer.from([0xff, 0xfe, 0x20, 0x62]))
  fs.writeFileSync(path.join(data, 'state.json'), '{not json')
  fs.writeFileSync(path.join(data, 'config.json'), '{"owner_headings": ["(unclosed"]}')
  const r = core(['context'])
  assert.equal(r.status, 0)
  JSON.parse(r.stdout)
})

// ------------------------------------------------------------------ health

const health = (today) => json(['health', '--json'], { today })

test('not set up is none', () => {
  assert.equal(health().level, 'none')
})

test('drift: green, then yellow, then red', () => {
  setupFocus()
  assert.equal(health().level, 'green')
  for (let i = 0; i < 3; i++) ok(['idea', `idea ${i}`])
  const h = health()
  assert.equal(h.level, 'yellow')
  assert.match(h.headline, /3 times/)
  for (let i = 0; i < 3; i++) ok(['idea', `more ${i}`])
  assert.equal(health().level, 'red')
})

test('old decisions are red', () => {
  const dir = makeProject()
  setupFocus('--sources-from-scan')
  const old = new Date('2023-11-14T00:00:00Z')
  fs.utimesSync(path.join(dir, 'STATE.md'), old, old)
  const h = health()
  assert.equal(h.level, 'red')
  assert.match(h.headline, /decisions waiting/)
})

test('an alert line wins', () => {
  makeProject('SHOP', STATE + '\n🚨 client production is down\n')
  setupFocus('--sources-from-scan')
  const h = health()
  assert.equal(h.level, 'siren')
  assert.equal(h.lamp, '🚨')
  assert.match(h.headline, /client production is down/)
  assert.match(ctx(), /🚨/)
})

test('config.json adds headings and alert prefixes in other languages', () => {
  makeProject('SHOP', '# STATE\n\n## Wartet auf Inhaber\n- Preis festlegen\n\nDRINGEND: Server down\n')
  setupFocus('--sources-from-scan')
  assert.equal(json(['decisions', '--json']).length, 0)
  fs.writeFileSync(path.join(data, 'config.json'),
    JSON.stringify({ owner_headings: ['wartet\\s+auf\\s+inhaber'], siren_prefixes: ['DRINGEND:'] }))
  assert.equal(json(['decisions', '--json'])[0].question, 'Preis festlegen')
  assert.equal(health().level, 'siren')
})

test('scattered across projects', () => {
  for (const name of ['A', 'B', 'C']) makeProject(name, null)
  setupFocus()
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const h = health(today) // the files were created just now
  assert.equal(h.level, 'red')
  assert.match(h.headline, /also touched 3 other projects/)
})

// ---------------------------------------------------------------- commands

test('setup, scan and sources', () => {
  makeProject('SHOP')
  makeProject('NOSTATE', null)
  const found = json(['scan'])
  assert.deepEqual(new Set(found.map((p) => p.name)), new Set(['SHOP', 'NOSTATE']))
  assert.equal(setupFocus('--sources-from-scan').decisions_waiting, 3)
  const status = json(['status'])
  assert.equal(status.configured, true)
  assert.equal(status.sources.length, 1)
})

test('scan looks where the session runs', () => {
  makeProject('SHOP')
  makeProject('NOSTATE', null)
  const home = path.join(base, 'home')
  fs.mkdirSync(home)
  const env = { ...process.env, HOME: home, USERPROFILE: '', HELPS_DATA: data, HELPS_PROJECT_ROOTS: '' }
  for (const cwd of [projects, path.join(projects, 'SHOP')]) {
    const r = spawnSync(process.execPath, [CLI, 'scan'], { cwd, env, encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    assert.deepEqual(new Set(JSON.parse(r.stdout).map((p) => p.name)), new Set(['SHOP', 'NOSTATE']))
  }
})

test('changing the main thing keeps the notes', () => {
  setupFocus()
  const file = path.join(data, 'FOCUS.md')
  fs.appendFileSync(file, 'a note of the person\n')
  ok(['focus', '--set', 'shop', '--finish', 'first sale'])
  const text = fs.readFileSync(file, 'utf8')
  assert.match(text, /project: shop/)
  assert.match(text, /allow: clients/)
  assert.match(text, /a note of the person/)
})

test('ideas: save and drop', () => {
  for (const text of ['uask.pro portal', 'expense bot']) ok(['idea', text, '--by', 'gemini'])
  let ideas = json(['ideas', '--json'])
  assert.equal(ideas[0].text, '2026-11-10 09:00 [gemini] uask.pro portal')
  ok(['ideas', '--drop', '1'])
  ideas = json(['ideas', '--json'])
  assert.equal(ideas.length, 1)
  assert.match(ideas[0].text, /expense bot/)
  assert.match(fs.readFileSync(path.join(data, 'IDEAS-done.md'), 'utf8'), /uask\.pro portal/)
  assert.equal(core(['ideas', '--drop', '5']).status, 2)
  assert.equal(core(['idea', '  ']).status, 2)
})

test('decisions and answers', () => {
  const dir = makeProject()
  setupFocus('--sources-from-scan')
  const decisions = json(['decisions', '--json'])
  assert.equal(decisions.length, 3)
  assert.match(decisions[0].question, /Second line of the item/)
  assert.ok(decisions.every((d) => !d.question.includes('not a decision')))
  ok(['answer', decisions[0].id, 'option', 'A'])
  ok(['answer', decisions[1].id, '199 euro, card'])
  const state = fs.readFileSync(path.join(dir, 'STATE.md'), 'utf8')
  assert.equal(state.split('## Owner answers (helps)').length, 2)
  assert.match(state, /→ option A/)
  assert.ok(state.indexOf('199 euro') < state.indexOf('→ option A'))
  assert.equal(json(['decisions', '--json']).length, 1)
  assert.equal(core(['answer', decisions[0].id, 'again']).status, 2)
})

test('link puts helps on PATH', { skip: process.platform === 'win32' }, () => {
  const bin = path.join(base, 'bin')
  ok(['link', '--dir', bin])
  assert.equal(fs.realpathSync(path.join(bin, 'helps')), fs.realpathSync(CLI))
  ok(['link', '--dir', bin])
})

// ------------------------------------------------------------------- build

const SKILLS = ['setup', 'focus', 'idea', 'decide', 'review']

test('plugins/ matches the build', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'build.mjs'), '--check'], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stdout + r.stderr)
})

test('manifests, hooks and skills', () => {
  for (const agent of ['claude', 'codex', 'gemini']) {
    const dir = path.join(ROOT, 'plugins', agent, 'helps')
    const hooks = JSON.parse(fs.readFileSync(path.join(dir, 'hooks', 'hooks.json'), 'utf8'))
    if (agent === 'claude') {
      assert.deepEqual(hooks, { modules: ['./register.js'] })
      for (const f of ['register.js', 'core.js', 'session.js']) assert.ok(fs.existsSync(path.join(dir, 'hooks', f)))
    } else {
      assert.match(hooks.hooks.SessionStart[0].hooks[0].command, new RegExp(`cli\\.mjs" context --agent ${agent}`))
      assert.equal(fs.readFileSync(path.join(dir, 'core', 'core.js'), 'utf8'),
        fs.readFileSync(path.join(ROOT, 'src', 'core.js'), 'utf8'))
    }
    for (const skill of SKILLS) {
      const body = fs.readFileSync(path.join(dir, 'skills', skill, 'SKILL.md'), 'utf8')
      assert.ok(!body.includes('{{'), `${agent}/${skill}`)
      assert.ok(body.startsWith(`---\nname: ${skill}\n`))
      if (agent === 'claude') assert.match(body, /mcp__helps__run/)
    }
    const decide = fs.readFileSync(path.join(dir, 'skills', 'decide', 'SKILL.md'), 'utf8')
    assert.equal(decide.includes('AskUserQuestion'), agent === 'claude')
  }
})

test('gemini commands are TOML', () => {
  const dir = path.join(ROOT, 'plugins', 'gemini', 'helps', 'commands', 'helps')
  for (const skill of SKILLS) {
    const text = fs.readFileSync(path.join(dir, `${skill}.toml`), 'utf8')
    assert.match(text, /^description = ".+"\nprompt = """\n[\s\S]+\n"""\n$/)
  }
})

test('package.json and the core agree on the version', async () => {
  const { VERSION } = await import('../src/core.js')
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  assert.equal(pkg.version, VERSION)
})

// ----------------------------------------------------------- this session

test('outside actions: servers, pushes, merges, deploys; not local work', async () => {
  const { outsideAction } = await import('../src/session.js')
  const cases = {
    'ssh -i ~/.ssh/k -o BatchMode=yes root@h11 uptime': 'ssh h11',
    'scp -r dist/ h11:/root/x/': 'scp h11',
    'git -C /x push origin main': 'git push',
    'git merge --no-ff task/a': 'git merge',
    'bin/merge-task task/x': 'merge-task',
    'bash docs/ops/provision-builder.sh': 'provision-builder.sh',
    'curl -s -X POST https://dev.example.com/api/v1/deploy': 'API write dev.example.com',
  }
  for (const [cmd, want] of Object.entries(cases)) assert.equal(outsideAction(cmd), want, cmd)
  for (const cmd of ['rsync -a src/ dst/', 'git status', 'ssh -T git@github.com', 'curl -s https://example.com',
    'curl -X POST http://localhost:8080/x', 'npm test', 'ls | grep ssh', './tools/check.sh']) {
    assert.equal(outsideAction(cmd), null, cmd)
  }
})

test('the session lamp: thresholds, worst first, drift never red', async () => {
  const { assess, newSessionState, ownerSpoke, sessionConfig, headline } = await import('../src/session.js')
  const cfg = sessionConfig({ context_red: 70, nonsense: 1 })
  assert.equal(cfg.context_red, 70)
  const s = newSessionState(0)
  assert.equal(assess(s, 0, cfg).level, 'green')
  s.outside.push({ label: 'ssh h11', at: 1 }, { label: 'ssh h11', at: 2 }, { label: 'git push', at: 3 }, { label: 'scp h11', at: 4, asked: true })
  s.lastActivityAt = 40 * 60000
  let v = assess(s, s.lastActivityAt, cfg)
  assert.equal(v.level, 'red')
  assert.deepEqual(v.reasons.map((r) => r.kind), ['outside', 'alone'])
  assert.match(headline('SHOP', v, s, s.lastActivityAt), /^SHOP · 3 outside actions without your word: ssh h11, git push · working without you 40 min/)
  ownerSpoke(s, 'ok', s.lastActivityAt)
  s.drift = { onTrack: false, reason: 'builds an editor' }
  v = assess(s, s.lastActivityAt, cfg)
  assert.equal(v.level, 'yellow')
  assert.equal(assess(s, 0, cfg, ['SHOP: site down']).level, 'siren')
})
