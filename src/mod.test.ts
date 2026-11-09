import { expect, mock, test } from 'claude-code/testing'

// The whole helps mod: the core runs inside Claude Code, files live in the test's memory.
// The lamp shows THIS session's state; the person's main thing sits beside it, dimmed.
const BAND = {
  plugin: 'helps',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  viewport: { columns: 120, rows: 40 },
  props: { hasSurvey: false, isWorking: false, maxRows: 6, bodyColumns: 110, scroll: { offset: 0, bodyRows: 6 }, view: {} },
} as const

const TODAY = '2026-11-10'
const DAY = Date.parse(TODAY + 'T09:00:00')
const FOCUS = `# FOCUS\n\nproject: helps\nfinish: the lamp is visible\nsince: 2026-11-08\nallow: clients\n\n## Notes\n`
const STATE = `# STATE\n\n## Waiting for owner\n1. Price and payment.\n2. Name.\n`

type File = { text: string; mtimeMs: number }

function disk(files: Record<string, string>, mtimeMs = DAY) {
  const fs = new Map<string, File>(Object.entries(files).map(([k, v]) => [k, { text: v, mtimeMs }]))
  const dirs = () => {
    const out = new Set<string>()
    for (const p of fs.keys()) {
      const parts = p.split('/')
      for (let i = 2; i < parts.length; i++) out.add(parts.slice(0, i).join('/'))
    }
    return out
  }
  return { fs, dirs }
}

async function start($: any, on: any, files: Record<string, string>, opts: { mtimeMs?: number; cwd?: string; context?: number; drift?: string; published?: string } = {}) {
  const cwd = opts.cwd || '/work/SHOP'
  const clock = mock.clock(on)
  const d = disk(files, opts.mtimeMs)
  const toasts: string[] = []
  const prompts: string[] = []
  const tools: string[] = []
  const status: (string | undefined)[] = []
  const env: Record<string, string> = { HOME: '/home/u', HELPS_TODAY: TODAY, HELPS_NOW: TODAY + ' 09:00' }
  on('session.start', () => ({ cwd }))
  on('session.cwd', () => ({ value: cwd }))
  on('session.usage', () => ({ value: { startedAt: DAY, context: { window: 1000000, percent: opts.context ?? 20 }, rateLimits: [] } }))
  on('model.complete', () => ({ value: { isAnswered: true, text: opts.drift ?? '{"on_track": true, "reason": "fine"}', usage: {} } }))
  on('turn.complete', ($: any, e: any) => ({ text: e.answer }))
  on('turn.start', ($: any, e: any) => ({ turnId: e.turnId }))
  on('session.end', () => ({ sessionId: 's1' }))
  on('tool.call', { tool: 'AskUserQuestion' }, ($: any, e: any) => ({ result: e.afk ? { answers: {}, afkTimeoutMs: 60000 } : { answers: { q: 'yes' } }, text: e.afk ? '' : 'yes' }))
  on('http.fetch', () => ({ value: { status: 200, ok: true, headers: {}, text: JSON.stringify({ version: opts.published ?? '0.0.1' }) } }))
  on('tool.call', { tool: 'Bash' }, ($: any, e: any) => (/fail/.test(e.command)
    ? { isError: true, result: 'exit 1', text: 'exit 1' }
    : { result: { stdout: 'ok', stderr: '' } }))
  on('command.register', () => ({ value: undefined }))
  on('tool.register', ($: any, e: any) => { tools.push(e.name); return { value: { tool: 'mcp__helps__' + e.name } } })
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'engine', scope: 'shared' }] }))
  on('env.get', ($: any, e: any) => ({ value: env[e.name] }))
  on('fs.read', ($: any, e: any) => {
    const f = d.fs.get(e.path)
    return f ? { value: f.text } : { deny: 'ENOENT ' + e.path }
  })
  on('fs.write', ($: any, e: any) => { d.fs.set(e.path, { text: e.text, mtimeMs: DAY }); return { value: undefined } })
  on('fs.exists', ($: any, e: any) => ({ value: d.fs.has(e.path) || d.dirs().has(e.path) }))
  on('fs.stat', ($: any, e: any) => {
    const f = d.fs.get(e.path)
    if (f) return { value: { kind: 'file', size: f.text.length, mtimeMs: f.mtimeMs, isLink: false, realPath: e.path } }
    if (d.dirs().has(e.path)) return { value: { kind: 'dir', size: 0, mtimeMs: 0, isLink: false, realPath: e.path } }
    return { deny: 'ENOENT ' + e.path }
  })
  on('fs.list', ($: any, e: any) => {
    const base = e.path.replace(/\/+$/, '') + '/'
    const names = new Map<string, 'file' | 'dir'>()
    for (const p of d.fs.keys()) {
      if (!p.startsWith(base)) continue
      const rest = p.slice(base.length).split('/')
      names.set(rest[0], rest.length > 1 ? 'dir' : 'file')
    }
    if (!names.size && !d.dirs().has(e.path)) return { deny: 'ENOENT ' + e.path }
    return { value: [...names].map(([name, kind]) => ({ name, kind, size: 0, mtimeMs: 0, isLink: false })) }
  })
  on('ui.toast', ($: any, e: any) => { toasts.push(e.text); return { value: undefined } })
  on('ui.status', ($: any, e: any) => { status.push(e.text); return { value: undefined } })
  on('prompt.submit', ($: any, e: any) => { prompts.push(e.text); return { text: e.text } })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.render', () => ({ type: 'Text', props: {}, children: [] }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd })
  await clock.settle()
  return { clock, toasts, prompts, tools, status, files: d.fs }
}

const DATA = '/home/u/helps-data'
const COMPOSE = { model: 'm', promptModel: 'm', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as any
const TURN = { reason: 'answer', answer: 'Done: the panel works.', durationMs: 1000, isAborted: false, turnId: 't1' } as any
const bash = ($: any, command: string) => $.tool.call({ tool: 'Bash', command, tool_use_id: 'b' + Math.random() })
const last = (a: any[]) => a[a.length - 1]

test('not set up: a Set up button and an offer in the prompt', async ($, on) => {
  const { tools } = await start($, on, {})
  expect(tools).toContain('run')
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ key: 'helps-setup' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /helps is not set up/ })).toBeDefined()
    await ui.unmount()
  }
  const { sections } = await $.prompt.compose(COMPOSE)
  expect(sections.find((s: any) => s.id === 'helps:focus').text).toContain('Set up now')
})

test('a calm session is green and names itself, the main thing is beside it', async ($, on) => {
  const { status } = await start($, on, { [DATA + '/FOCUS.md']: FOCUS })
  expect(last(status)).toMatch(/^🟢 SHOP · on track · 0 min since your message · context 20% · main: helps$/)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /SHOP · on track/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /main: helps/ })).toBeDefined()
  expect(await ui.find({ key: 'helps-back' })).toBeUndefined()
  expect(await ui.find({ key: 'helps-more' })).toBeDefined()
  const { sections } = await $.prompt.compose(COMPOSE)
  expect(sections.find((s: any) => s.id === 'helps:focus').text).toContain("The person's main thing: helps")
})

test('other projects touched today no longer color this session', async ($, on) => {
  const { status } = await start($, on, {
    [DATA + '/FOCUS.md']: FOCUS,
    [DATA + '/IDEAS.md']: '# IDEAS\n\n- 2026-11-10 09:00 [claude] a\n- 2026-11-10 09:00 [claude] b\n- 2026-11-10 09:00 [claude] c\n',
  })
  expect(last(status)).toMatch(/^🟢 SHOP · on track/)
  const pane = await $.ui.mount({ plugin: 'helps', surface: 'terminal', component: 'Pane', requestId: 'helps-lamp',
    viewport: { columns: 100, rows: 40 }, props: {} } as any)
  expect(await pane.find({ type: 'Text', text: /drifted off 3 times today/ })).toBeDefined()
})

test('outside actions without your word: yellow, then red, and a report button', async ($, on) => {
  const { status, prompts, toasts } = await start($, on, { [DATA + '/FOCUS.md']: FOCUS })
  await bash($, 'git status && git push origin main')
  expect(last(status)).toMatch(/^🟡 SHOP · 1 outside action without your word: git push/)
  await bash($, 'ssh -o BatchMode=yes h11 "ls"')
  await bash($, 'scp dist.tar h11:/root/')
  expect(last(status)).toMatch(/^🔴 SHOP · 3 outside actions without your word: git push, ssh h11, scp h11/)
  expect(toasts.some((t) => t.startsWith('🔴'))).toBe(true)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'helps-report' })
  expect(last(prompts)).toContain('what you did since my last message')
  expect(await ui.find({ key: 'helps-pause' })).toBeDefined()
})

test('an outside action in reply to you does not color the lamp; on its own it does', async ($, on) => {
  const { status } = await start($, on, { [DATA + '/FOCUS.md']: FOCUS })
  await $.prompt.submit({ text: 'push it' })
  await $.turn.start({ text: 'push it', turnId: 'o1' })
  await bash($, 'git push origin main')
  expect(last(status)).toMatch(/^🟢 SHOP · on track/)
  await $.turn.complete({ ...TURN, turnId: 'o1' })
  await $.turn.start({ text: '', turnId: 'auto1' })
  await bash($, 'scp dist.tar h11:/root/')
  expect(last(status)).toMatch(/^🟡 SHOP · 1 outside action without your word: scp h11/)
})

test('your message starts the count over', async ($, on) => {
  const { status } = await start($, on, { [DATA + '/FOCUS.md']: FOCUS })
  await bash($, 'ssh h11 uptime')
  expect(last(status)).toMatch(/^🟡/)
  await $.prompt.submit({ text: 'ok, go on' })
  expect(last(status)).toMatch(/^🟢 SHOP · on track/)
})

test('working without you for hours turns red', async ($, on) => {
  const { clock, status } = await start($, on, { [DATA + '/FOCUS.md']: FOCUS })
  for (let i = 0; i < 3; i++) await clock.advance(15 * 60000)
  await bash($, 'ls')
  expect(last(status)).toMatch(/^🟡 SHOP · working without you 45 min/)
  for (let i = 0; i < 6; i++) await clock.advance(15 * 60000)
  await bash($, 'ls')
  expect(last(status)).toMatch(/^🔴 SHOP · working without you 2 h 15 min/)
})

test('stuck: the same command failing again and again', async ($, on) => {
  const { status } = await start($, on, { [DATA + '/FOCUS.md']: FOCUS })
  for (let i = 0; i < 3; i++) await bash($, 'pg_dump --fail core')
  expect(last(status)).toMatch(/^🟡 SHOP · stuck: "pg_dump --fail core" failed 3×/)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ key: 'helps-stuck' })).toBeDefined()
  await bash($, 'ls')
  expect(last(status)).toMatch(/^🟢/)
})

test('a full context window is red', async ($, on) => {
  const { status } = await start($, on, { [DATA + '/FOCUS.md']: FOCUS }, { context: 80 })
  expect(last(status)).toMatch(/^🔴 SHOP · context 80% full/)
})

test('drift check: yellow with the reason, never red', async ($, on) => {
  const { clock, status } = await start($, on, { [DATA + '/FOCUS.md']: FOCUS },
    { drift: '{"on_track": false, "reason": "you asked for simple presets; it builds a section editor"}' })
  await $.prompt.submit({ text: 'just a set of compatible presets, much simpler' })
  for (let i = 0; i < 3; i++) await $.turn.complete({ ...TURN, turnId: 't' + i })
  await clock.advance(10)
  await clock.settle()
  const pane = await $.ui.mount({ plugin: 'helps', surface: 'terminal', component: 'Pane', requestId: 'helps-lamp',
    viewport: { columns: 100, rows: 40 }, props: {} } as any)
  const dl = await pane.find({ type: 'Text', text: /Drift check/ })
  expect(dl ? JSON.stringify(dl.children) : 'none').toContain('drifting')
  expect(last(status)).toMatch(/^🟡 SHOP · drifting from your ask: you asked for simple presets; it builds a section editor/)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ key: 'helps-drift' })).toBeDefined()
})

test('in the main thing\'s own session the main-thing buttons come back', async ($, on) => {
  const { files } = await start($, on, {
    [DATA + '/FOCUS.md']: FOCUS,
    [DATA + '/inbox-sources.txt']: '/home/u/projects/*/STATE.md\n',
    '/home/u/projects/SHOP/STATE.md': STATE,
  }, { cwd: '/home/u/projects/helps', mtimeMs: Date.parse('2026-11-01T09:00:00') })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ key: 'helps-decide' })).toBeDefined()
  expect(await ui.find({ key: 'helps-back' })).toBeDefined()
  const list = JSON.parse((await $.tool.call({ tool: 'mcp__helps__run', args: ['decisions', '--json'] })).result)
  await $.tool.call({ tool: 'mcp__helps__run', args: ['answer', list[0].id, '199 euro'] })
  expect(files.get('/home/u/projects/SHOP/STATE.md')!.text).toContain('## Owner answers (helps)')
})

test('tool: errors come back as plain text', async ($, on) => {
  await start($, on, {})
  const r = await $.tool.call({ tool: 'mcp__helps__run', args: ['ideas', '--drop', '5'] })
  expect(r.isError).toBe(true)
})

test('an alert line blinks', async ($, on) => {
  const { clock } = await start($, on, {
    [DATA + '/FOCUS.md']: FOCUS,
    [DATA + '/inbox-sources.txt']: '/home/u/projects/*/STATE.md\n',
    '/home/u/projects/SHOP/STATE.md': '# STATE\n🚨 client production is down\n',
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const first = await ui.find({ type: 'Text', text: / 🚨 EMERGENCY / })
  expect(first).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /SHOP: client production is down/ })).toBeDefined()
  await clock.advance(500)
  const second = await ui.find({ type: 'Text', text: / 🚨 EMERGENCY / })
  expect(Boolean(first.props.inverse)).not.toBe(Boolean(second.props.inverse))
})

test('a newer published version shows beside the lamp, with how to update in Details', async ($, on) => {
  const { status, toasts } = await start($, on, { [DATA + '/FOCUS.md']: FOCUS }, { published: '99.0.0' })
  expect(last(status)).toMatch(/main: helps · update 99\.0\.0 available$/)
  expect(toasts.some((t) => t.includes('helps 99.0.0 is out'))).toBe(true)
  const pane = await $.ui.mount({ plugin: 'helps', surface: 'desktop', component: 'Pane', requestId: 'helps-lamp',
    viewport: { columns: 100, rows: 40 }, props: {} } as any)
  expect(await pane.find({ type: 'Text', text: /Customize → Plugins → helps → Update/ })).toBeDefined()
})

test('a question nobody answered (the person was away) is not their word', async ($, on) => {
  const { status } = await start($, on, { [DATA + '/FOCUS.md']: FOCUS })
  await bash($, 'scp dist.tar h11:/root/')
  expect(last(status)).toMatch(/^🟡/)
  await $.tool.call({ tool: 'AskUserQuestion', questions: [], afk: true } as any)
  expect(last(status)).toMatch(/^🟡 SHOP · 1 outside action/)
  await $.tool.call({ tool: 'AskUserQuestion', questions: [] } as any)
  expect(last(status)).toMatch(/^🟢 SHOP · on track/)
})

test('/clear starts the session count over', async ($, on) => {
  const { status } = await start($, on, { [DATA + '/FOCUS.md']: FOCUS })
  await bash($, 'ssh h11 uptime')
  expect(last(status)).toMatch(/^🟡/)
  await $.session.end({ reason: 'clear' } as any)
  expect(last(status)).toMatch(/^🟢 SHOP · on track/)
})
