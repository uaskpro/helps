import { expect, mock, test } from 'claude-code/testing'

// The whole helps mod: the core runs inside Claude Code, files live in the test's memory.
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

async function start($: any, on: any, files: Record<string, string>, opts: { mtimeMs?: number } = {}) {
  const clock = mock.clock(on)
  const d = disk(files, opts.mtimeMs)
  const toasts: string[] = []
  const prompts: string[] = []
  const tools: string[] = []
  const status: (string | undefined)[] = []
  const env: Record<string, string> = { HOME: '/home/u', HELPS_TODAY: TODAY, HELPS_NOW: TODAY + ' 09:00' }
  on('session.start', () => ({ cwd: '/work' }))
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
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await clock.settle()
  return { clock, toasts, prompts, tools, status, files: d.fs }
}

const DATA = '/home/u/helps-data'
const COMPOSE = { model: 'm', promptModel: 'm', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as any

test('not set up: Set up button and an offer in the prompt', async ($, on) => {
  const { tools } = await start($, on, {})
  expect(tools).toContain('run')
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ key: 'helps-setup' })).toBeDefined()
    await ui.unmount()
  }
  const { sections } = await $.prompt.compose(COMPOSE)
  const ours = sections.find((s: any) => s.id === 'helps:focus')
  expect(ours.text).toContain('Set up now')
})

test('set up: green lamp and the main thing in the prompt', async ($, on) => {
  const { status } = await start($, on, { [DATA + '/FOCUS.md']: FOCUS })
  expect(status[status.length - 1]).toBe('🟢 Main thing: helps · on track: helps')
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /on track: helps/ })).toBeDefined()
  expect(await ui.find({ key: 'helps-back' })).toBeUndefined()
  const { sections } = await $.prompt.compose(COMPOSE)
  const ours = sections.find((s: any) => s.id === 'helps:focus')
  expect(ours.text).toContain("The person's main thing: helps")
  expect(ours.text).toContain('Day 2.')
})

test('tool: saved ideas turn the lamp yellow, toast and Back button', async ($, on) => {
  const { clock, toasts, prompts, status, files } = await start($, on, { [DATA + '/FOCUS.md']: FOCUS })
  for (const t of ['portal', 'bot', 'site']) {
    const r = await $.tool.call({ tool: 'mcp__helps__run', args: ['idea', t, '--by', 'claude'] })
    expect(r.result).toContain('Saved for later')
  }
  expect(files.get(DATA + '/IDEAS.md')!.text).toContain('- 2026-11-10 09:00 [claude] site')
  await clock.advance(30_000)
  expect(toasts.some((t) => t.includes('3 times'))).toBe(true)
  expect(status[status.length - 1]).toContain('🟡 Main thing: helps')
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /drifted off/ })).toBeDefined()
  await ui.press({ key: 'helps-back' })
  expect(prompts[0]).toContain('back to the main thing')
})

test('tool: errors come back as plain text', async ($, on) => {
  await start($, on, {})
  const r = await $.tool.call({ tool: 'mcp__helps__run', args: ['ideas', '--drop', '5'] })
  expect(r.isError).toBe(true)
  const bad = await $.tool.call({ tool: 'mcp__helps__run', args: ['no-such'] })
  expect(bad.isError).toBe(true)
})

test('decisions: old ones are red, the answer goes into the project', async ($, on) => {
  const { clock, files } = await start($, on, {
    [DATA + '/FOCUS.md']: FOCUS,
    [DATA + '/inbox-sources.txt']: '# x\n/home/u/projects/*/STATE.md\n',
    '/home/u/projects/SHOP/STATE.md': STATE,
  }, { mtimeMs: Date.parse('2026-11-01T09:00:00') })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /decisions waiting 9 days \(2\)/ })).toBeDefined()
  expect(await ui.find({ key: 'helps-decide' })).toBeDefined()
  const list = JSON.parse((await $.tool.call({ tool: 'mcp__helps__run', args: ['decisions', '--json'] })).result)
  expect(list.length).toBe(2)
  expect(list[0].project).toBe('SHOP')
  await $.tool.call({ tool: 'mcp__helps__run', args: ['answer', list[0].id, '199 euro'] })
  expect(files.get('/home/u/projects/SHOP/STATE.md')!.text).toContain('## Owner answers (helps)\n- 2026-11-10: "Price and payment." → 199 euro')
  await clock.advance(30_000)
})

test('the emergency lamp blinks', async ($, on) => {
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
