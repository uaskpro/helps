// helps core: one main thing, everything else saved for later, decisions that wait for the person.
//
// Shared by every wrapper: the Claude Code mod reaches files through $.fs, the CLI (cli.mjs,
// used by Codex and Gemini CLI) through Node. Neither is assumed here: all access goes through `io`:
//
//   io = { read(path) → text, write(path, text), list(dir) → [{ name, kind, isLink }],
//          exists(path) → bool, stat(path, { resolve }) → { kind, mtimeMs, realPath },
//          env(name) → string | undefined, now() → ms, pathSep?: ':' | ';', cli?: string }
//
// Data lives outside the plugin, in HELPS_DATA (default ~/helps-data):
//   FOCUS.md           the main thing and what "done" means
//   IDEAS.md           saved for later, one line per idea
//   inbox-sources.txt  glob patterns of project state files where decisions come from
//   config.json        optional: extra owner-section headings and alert prefixes
//   state.json         internal: answered decisions, when offers were made

export const VERSION = '0.6.2'
export const TOOL = 'mcp__helps__run'

const FOCUS_TEMPLATE = (project, finish, today, allow) => `# FOCUS

project: ${project}
finish: ${finish}
since: ${today}
allow: ${allow}

## Notes
Nothing below "Notes" is added to the session.
`

const IDEAS_TEMPLATE = `# IDEAS

Saved for later. One line per idea.

`

const SOURCES_TEMPLATE = `# Glob patterns of project state files, one per line. Lines starting with # are comments.
# The project is the name of the folder that holds the file.
`

export const DEFAULT_ALLOW = 'urgent client help, outages and security'
const PROJECT_MARKERS = ['STATE.md', 'CLAUDE.md', 'AGENTS.md', 'GEMINI.md', '.git']
const ANSWERS_HEADING = '## Owner answers (helps)'
const REVIEW_EVERY_DAYS = 7

// Sections of a project's STATE.md that hold questions for the person. More can be added in
// config.json ("owner_headings": regular expressions), e.g. for state files in other languages.
const OWNER_HEADING =
  'waiting\\s+(?:for|on)\\s+(?:the\\s+)?owner|owner\\s+decisions?|needs?\\s+(?:the\\s+)?owner|' +
  'for\\s+the\\s+owner|questions?\\s+for\\s+(?:the\\s+)?owner|blocked\\s+on\\s+(?:the\\s+)?owner|decisions?\\s+needed'
// A line starting with one of these anywhere in a state file turns the lamp into an alert.
const SIREN_PREFIXES = ['🚨', 'URGENT:', 'ALERT:']

const HEADING = /^(#{1,6})\s+(.*)$/u
const ITEM = /^\s{0,3}(?:[-*+]|\d+[.)])\s+(.*\S)\s*$/u
const FIELD = /^([a-z_]+):\s*(.*?)\s*$/u

const LEVELS = ['green', 'yellow', 'red', 'siren']
export const LAMP = { none: '⚪', green: '🟢', yellow: '🟡', red: '🔴', siren: '🚨' }
export const AGENTS = ['claude', 'codex', 'gemini', 'other']

export const ASK = {
  claude: 'Ask questions only through the pop-up with buttons, the AskUserQuestion tool ' +
    '(2–4 options, short labels, the recommended one first and marked as recommended). ' +
    'Do not write the options as chat text.',
  codex: 'Ask questions through your built-in choice dialog if you have one (for example ' +
    'request_user_input); otherwise as a short numbered list, "reply with a number".',
  gemini: 'Ask questions through your built-in choice dialog if you have one (for example ' +
    'ask_user); otherwise as a short numbered list, "reply with a number".',
  other: 'Ask questions through a choice dialog if there is one; otherwise as a numbered list.',
}

function words(agent) {
  return 'Talk to the person in plain words and in their language: "main thing", "saved for later", ' +
    '"waiting for your decision". Do not say "focus", "inbox", "hook", "IDEAS.md" or "STATE.md", nor their translations, ' +
    'and do not show commands or paths. ' + (ASK[agent] || ASK.other)
}

// ------------------------------------------------------------------ helpers

export function splitlines(text) {
  if (!text) return []
  const parts = text.split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/u)
  if (parts[parts.length - 1] === '') parts.pop()
  return parts
}

const squash = (s) => String(s).split(/\s+/u).filter(Boolean).join(' ')
const cut = (s, n) => Array.from(s).slice(0, n).join('')
const clen = (s) => Array.from(s).length
const pad = (n) => String(n).padStart(2, '0')
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

function isoDate(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function dayNumber(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return null
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3])
  if (new Date(t).getUTCMonth() !== +m[2] - 1) return null
  return Math.round(t / 86400000)
}

const norm = (p) => String(p).replace(/\\/g, '/')

function join(...parts) {
  let out = ''
  for (const raw of parts) {
    const p = norm(raw)
    if (!p) continue
    if (!out || /^\/|^[A-Za-z]:\//.test(p)) out = p
    else out = out.replace(/\/+$/, '') + '/' + p.replace(/^\/+/, '')
  }
  return out
}

const parentName = (p) => {
  const parts = norm(p).split('/').filter(Boolean)
  return parts.length >= 2 ? parts[parts.length - 2] : ''
}

async function tryRead(io, path) {
  try { return await io.read(path) } catch { return null }
}

async function isDir(io, path) {
  try { return (await io.stat(path)).kind === 'dir' } catch { return false }
}

// ---------------------------------------------------------------- context

export async function makeCtx(io) {
  const profile = (await io.env('USERPROFILE')) || ''
  const windows = /^[A-Za-z]:[\\/]/.test(profile)
  // On Windows, HOME from Git Bash looks like /c/Users/…, which file calls do not understand.
  const home = norm(windows ? profile : (await io.env('HOME')) || profile)
  const pathSep = io.pathSep || (windows ? ';' : ':')
  const expand = (p) => {
    const s = norm(p)
    if (s === '~') return home
    if (s.startsWith('~/')) return join(home, s.slice(2))
    return s
  }
  const raw = await io.env('HELPS_DATA')
  const root = raw ? expand(raw) : join(home, 'helps-data')
  const fixedToday = await io.env('HELPS_TODAY') // for tests
  const fixedNow = await io.env('HELPS_NOW') // for tests
  const nowMs = await io.now()
  const d = new Date(nowMs)
  const today = fixedToday || isoDate(nowMs)
  const stamp = fixedNow || `${isoDate(nowMs)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  const rootsEnv = await io.env('HELPS_PROJECT_ROOTS')
  let cwd = ''
  try { cwd = io.cwd ? norm(await io.cwd()) : '' } catch { /* unknown */ }
  const ctx = { io, home, root, today, stamp, expand, rootsEnv, pathSep, cwd, cli: io.cli || 'helps',
    f: (name) => join(root, name) }
  ctx.config = await readConfig(ctx)
  return ctx
}

function daysSince(ctx, ms) {
  return dayNumber(ctx.today) - dayNumber(isoDate(ms))
}

async function readJson(ctx, name) {
  const text = await tryRead(ctx.io, ctx.f(name))
  if (text === null) return {}
  try {
    const data = JSON.parse(text)
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  } catch { return {} }
}

async function readConfig(ctx) {
  const cfg = await readJson(ctx, 'config.json')
  const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x) : [])
  const extra = strings(cfg.owner_headings).filter((p) => { try { new RegExp(p, 'iu'); return true } catch { return false } })
  const prefixes = SIREN_PREFIXES.concat(strings(cfg.siren_prefixes))
  return {
    ownerHeading: new RegExp([OWNER_HEADING, ...extra].map((p) => `(?:${p})`).join('|'), 'iu'),
    siren: new RegExp(`^\\s*(?:[-*+]\\s+)?(?:${prefixes.map(escapeRe).join('|')})\\s*(.+)$`, 'u'),
  }
}

const readState = (ctx) => readJson(ctx, 'state.json')

async function writeState(ctx, state) {
  await ctx.io.write(ctx.f('state.json'), JSON.stringify(state, null, 2) + '\n')
}

// ------------------------------------------------------------------ focus

export async function readFocus(ctx) {
  const text = await tryRead(ctx.io, ctx.f('FOCUS.md'))
  if (text === null) return null
  const fields = {}
  for (const line of splitlines(text)) {
    if (line.startsWith('## ')) break
    const m = FIELD.exec(line.trim())
    if (m && m[2]) fields[m[1]] = m[2]
  }
  return fields.project ? fields : null
}

async function writeFocus(ctx, project, finish, allow) {
  const old = (await tryRead(ctx.io, ctx.f('FOCUS.md'))) || ''
  const current = (await readFocus(ctx)) || {}
  const al = allow != null ? allow : (current.allow != null ? current.allow : DEFAULT_ALLOW)
  let body = FOCUS_TEMPLATE(project, finish || 'not set', ctx.today, al)
  // The person's own notes below the fields are kept.
  if (old.includes('## ')) body = body.slice(0, body.indexOf('## ')) + old.slice(old.indexOf('## '))
  await ctx.io.write(ctx.f('FOCUS.md'), body)
}

function focusDays(ctx, focus) {
  const a = dayNumber(ctx.today)
  const b = dayNumber(focus.since)
  return a === null || b === null ? null : a - b
}

// ------------------------------------------------------------------ ideas

async function addIdea(ctx, text, by) {
  text = squash(text)
  if (!text) throw new Error('empty idea')
  const body = (await tryRead(ctx.io, ctx.f('IDEAS.md'))) ?? IDEAS_TEMPLATE
  const line = `- ${ctx.stamp} [${by}] ${text}`
  await ctx.io.write(ctx.f('IDEAS.md'), body + line + '\n')
  return line
}

async function ideaLines(ctx) {
  const text = await tryRead(ctx.io, ctx.f('IDEAS.md'))
  return text === null ? [] : splitlines(text).filter((l) => l.startsWith('- '))
}

async function dropIdea(ctx, n) {
  const ideas = await ideaLines(ctx)
  if (!(n >= 1 && n <= ideas.length)) throw new Error(`no idea number ${n}`)
  const target = ideas[n - 1]
  const lines = splitlines(await ctx.io.read(ctx.f('IDEAS.md')))
  lines.splice(lines.indexOf(target), 1)
  await ctx.io.write(ctx.f('IDEAS.md'), lines.join('\n') + '\n')
  const done = (await tryRead(ctx.io, ctx.f('IDEAS-done.md'))) || ''
  await ctx.io.write(ctx.f('IDEAS-done.md'), done + `${target}  → dropped ${ctx.today}\n`)
  return target
}

// -------------------------------------------------------------- decisions

async function sourcePatterns(ctx) {
  const text = await tryRead(ctx.io, ctx.f('inbox-sources.txt'))
  if (text === null) return []
  return splitlines(text).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map(ctx.expand)
}

async function addSource(ctx, pattern) {
  if ((await sourcePatterns(ctx)).includes(pattern)) return false
  const body = (await tryRead(ctx.io, ctx.f('inbox-sources.txt'))) ?? SOURCES_TEMPLATE
  await ctx.io.write(ctx.f('inbox-sources.txt'), body + pattern + '\n')
  return true
}

function segmentRegex(seg) {
  let re = ''
  for (let i = 0; i < seg.length; i++) {
    const c = seg[i]
    if (c === '*') re += '.*'
    else if (c === '?') re += '.'
    else if (c === '[') {
      const end = seg.indexOf(']', i + 2)
      if (end < 0) { re += '\\['; continue }
      let body = seg.slice(i + 1, end)
      if (body[0] === '!') body = '^' + body.slice(1)
      re += '[' + body.replace(/\\/g, '\\\\') + ']'
      i = end
    } else re += escapeRe(c)
  }
  return new RegExp('^' + re + '$', 'su')
}

const MAGIC = /[*?[]/

// Shell-style glob without recursion: * does not match hidden names, ** works as *.
export async function glob(io, pattern) {
  const p = norm(pattern)
  const drive = /^[A-Za-z]:\//.exec(p)
  let start = ''
  let rest = p
  if (drive) { start = drive[0]; rest = p.slice(start.length) }
  else if (p.startsWith('/')) { start = '/'; rest = p.slice(1) }
  const segs = rest.split('/').filter(Boolean)
  if (!segs.length) return []
  let paths = [start]
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]
    const last = i === segs.length - 1
    const next = []
    for (const base of paths) {
      if (!MAGIC.test(seg)) {
        const full = base ? join(base, seg) : seg
        if (last ? await io.exists(full) : await isDir(io, full)) next.push(full)
        continue
      }
      let entries
      try { entries = await io.list(base || '.') } catch { continue }
      const re = segmentRegex(seg)
      for (const ent of entries) {
        if (ent.name.startsWith('.') && !seg.startsWith('.')) continue
        if (!re.test(ent.name)) continue
        const full = base ? join(base, ent.name) : ent.name
        if (!last && ent.kind !== 'dir' && !(ent.isLink && await isDir(io, full))) continue
        next.push(full)
      }
    }
    paths = next
    if (!paths.length) break
  }
  return paths.sort()
}

// Items of the sections addressed to the person; a nested section belongs to its parent.
export function ownerItems(text, ownerHeading) {
  const items = []
  let level = null
  let current = null
  for (const raw of splitlines(text)) {
    const h = HEADING.exec(raw)
    if (h) {
      const depth = h[1].length
      if (level !== null && depth <= level) level = null
      if (level === null && ownerHeading.test(h[2])) level = depth
      if (current) { items.push(current); current = null }
      continue
    }
    if (level === null) continue
    const m = ITEM.exec(raw)
    if (m && raw.length - raw.trimStart().length < 4) {
      if (current) items.push(current)
      current = m[1]
    } else if (current && raw.trim()) {
      current += ' ' + raw.trim()
    } else if (!raw.trim() && current) {
      items.push(current)
      current = null
    }
  }
  if (current) items.push(current)
  return items
}

async function itemId(path, item) {
  const data = new TextEncoder().encode(`${path}\n${item}`)
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', data))
  return Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 8)
}

async function collectDecisions(ctx, includeAnswered = false) {
  const answered = (await readState(ctx)).answered || {}
  const seen = new Set()
  const result = []
  for (const pattern of await sourcePatterns(ctx)) {
    for (const path of await glob(ctx.io, pattern)) {
      if (seen.has(path)) continue
      let st
      try { st = await ctx.io.stat(path) } catch { continue }
      if (st.kind !== 'file') continue
      seen.add(path)
      const text = await tryRead(ctx.io, path)
      if (text === null) continue
      for (const item of ownerItems(text, ctx.config.ownerHeading)) {
        const id = await itemId(path, item)
        if (id in answered && !includeAnswered) continue
        result.push({ id, project: parentName(path), file: path, age_days: daysSince(ctx, st.mtimeMs), question: item })
      }
    }
  }
  return result
}

async function answerDecision(ctx, id, text) {
  text = squash(text)
  if (!text) throw new Error('empty answer')
  const dec = (await collectDecisions(ctx)).find((d) => d.id === id)
  if (!dec) throw new Error(`no open decision ${id}`)
  let body = await ctx.io.read(dec.file)
  const short = clen(dec.question) <= 120 ? dec.question : cut(dec.question, 117) + '…'
  const line = `- ${ctx.today}: "${short}" → ${text}`
  const at = body.indexOf(ANSWERS_HEADING)
  if (at >= 0) { // the newest answer goes right under the heading
    const head = body.slice(0, at)
    const tail = body.slice(at + ANSWERS_HEADING.length).replace(/^\n+/, '')
    body = head + ANSWERS_HEADING + '\n' + line + '\n' + tail
  } else {
    body = body.replace(/\n+$/, '') + `\n\n${ANSWERS_HEADING}\n${line}\n`
  }
  await ctx.io.write(dec.file, body)
  const state = await readState(ctx)
  state.answered = state.answered || {}
  state.answered[id] = { date: ctx.today, answer: text, project: dec.project }
  await writeState(ctx, state)
  return { project: dec.project, file: dec.file, line }
}

// --------------------------------------------------------------- projects

// Folders whose subfolders are projects: where the session runs (it may be a project or a folder
// of projects, on a local disk or a share), its parent, then the usual places in the home folder.
function projectRoots(ctx) {
  if (ctx.rootsEnv) return ctx.rootsEnv.split(ctx.pathSep).filter(Boolean).map(ctx.expand)
  const h = ctx.home
  const parent = ctx.cwd.replace(/\/+$/, '').replace(/\/[^/]*$/, '').replace(/^([A-Za-z]:)$/, '$1/')
  const here = ctx.cwd ? [ctx.cwd, parent].filter((p) => p && p !== h) : []
  return here.concat(['projects', 'Projects', 'code', 'src', 'dev', 'Documents', 'Desktop'].map((n) => join(h, n)), [h])
}

async function scanProjects(ctx, limit = 40) {
  const found = new Map()
  for (const base of projectRoots(ctx)) {
    let children
    try { children = await ctx.io.list(base) } catch { continue }
    children = [...children].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    for (const ch of children) {
      if (ch.name.startsWith('.')) continue
      const path = join(base, ch.name)
      if (ch.kind !== 'dir' && !(ch.isLink && await isDir(ctx.io, path))) continue
      const markers = []
      let mtime = 0
      for (const m of PROJECT_MARKERS) {
        try {
          const st = await ctx.io.stat(join(path, m))
          markers.push(m)
          mtime = Math.max(mtime, st.mtimeMs)
        } catch { /* not there */ }
      }
      if (!markers.length) continue
      let key = path
      try { key = (await ctx.io.stat(path, { resolve: true })).realPath || path } catch { /* as is */ }
      if (found.has(key)) continue
      found.set(key, { name: ch.name, path, markers, has_state: markers.includes('STATE.md'),
        days_since_change: daysSince(ctx, mtime) })
    }
  }
  return [...found.values()].sort((a, b) => a.days_since_change - b.days_since_change).slice(0, limit)
}

// ----------------------------------------------------------------- health

// How far things are drifting: green → yellow → red → siren, with the reasons.
export async function health(ctx) {
  const focus = await readFocus(ctx)
  if (!focus) return { level: 'none', lamp: LAMP.none, headline: 'helps is not set up', reasons: [] }
  let level = 'green'
  const reasons = []
  const flag = (lvl, kind, text) => {
    if (LEVELS.indexOf(lvl) > LEVELS.indexOf(level)) level = lvl
    reasons.push({ level: lvl, kind, text })
  }

  for (const pattern of await sourcePatterns(ctx)) {
    for (const path of await glob(ctx.io, pattern)) {
      const text = await tryRead(ctx.io, path)
      if (text === null) continue
      for (const line of splitlines(text)) {
        const m = ctx.config.siren.exec(line)
        if (m) flag('siren', 'alert', `${parentName(path)}: ${cut(m[1].trim(), 120)}`)
      }
    }
  }

  const decisions = await collectDecisions(ctx)
  if (decisions.length) {
    const oldest = Math.max(...decisions.map((d) => d.age_days))
    if (oldest >= 3) flag('red', 'decisions', `decisions waiting ${oldest} days (${decisions.length})`)
    else if (oldest >= 1 || decisions.length >= 10) flag('yellow', 'decisions', `decisions waiting: ${decisions.length}`)
  }

  const drift = (await ideaLines(ctx)).filter((l) => l.slice(2, 12) === ctx.today).length
  if (drift >= 6) flag('red', 'drift', `drifted off ${drift} times today`)
  else if (drift >= 3) flag('yellow', 'drift', `drifted off ${drift} times today`)

  const main = focus.project.toLowerCase()
  const projects = await scanProjects(ctx)
  const others = projects.filter((p) => p.days_since_change === 0 && p.name.toLowerCase() !== main).map((p) => p.name)
  if (others.length >= 3) flag('red', 'scatter', `also touched ${others.length} other projects today: ${others.slice(0, 4).join(', ')}`)
  else if (others.length >= 2) flag('yellow', 'scatter', `also touched today: ${others.join(', ')}`)
  const mine = projects.filter((p) => p.name.toLowerCase() === main)
  if (mine.length) {
    const quiet = mine[0].days_since_change
    if (quiet >= 3) flag('red', 'quiet', `nothing new on the main thing for ${quiet} days`)
    else if (quiet >= 2) flag('yellow', 'quiet', `main thing quiet for ${quiet} days`)
  }

  reasons.sort((a, b) => LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level))
  const headline = reasons.length ? reasons[0].text : `on track: ${focus.project}`
  return { level, lamp: LAMP[level], headline, reasons, project: focus.project, finish: focus.finish }
}

// ----------------------------------------------------------- session text

function commandsNote(ctx, agent) {
  if (agent === 'claude') {
    return `Assistant commands for you (never show them to the person): the ${TOOL} tool; args are what ` +
      'follows the word helps, for example ["status"] or ["idea", "<gist>", "--by", "claude"].'
  }
  return `Assistant commands for you (never show them to the person): ${ctx.cli} …`
}

function saveIdeaHow(ctx, agent) {
  return agent === 'claude'
    ? `${TOOL}, args ["idea", "<gist>", "--by", "claude"]`
    : `\`${ctx.cli} idea "<gist>" --by ${agent}\``
}

// The text every session starts with: the main thing, the lamp, the brake, today's offers.
export async function contextText(ctx, agent = 'claude', mark = true) {
  if (!AGENTS.includes(agent)) agent = 'other'
  const focus = await readFocus(ctx)
  if (!focus) {
    return [
      '[helps] The helps assistant is installed but not set up yet.',
      'In your first reply this session, after answering what the person actually asked, briefly offer ' +
      'a one-minute setup with two options: "Set up now" and "Later". On "Set up now", use the setup skill. ' +
      'On "Later", do not offer it again this session.',
      words(agent),
      commandsNote(ctx, agent),
    ].join('\n')
  }
  const project = focus.project
  const days = focusDays(ctx, focus)
  const hl = await health(ctx)
  const lines = [
    `[helps] The person's main thing: ${project}. Done when: ${focus.finish || 'not set'}.` +
      (days !== null ? ` Day ${days}.` : ''),
    `Your first reply this session, whatever the request, starts with one short line: "${hl.lamp} Main thing now: ${project}"` +
      (hl.level === 'green' ? '' : ` and the reason for the color: "${hl.headline}"`) +
      ', in the person\'s language. helps works the color out; copy it as given and never pick a color yourself. ' +
      'Colors: 🟢 on track, 🟡 starting to drift, 🔴 going the wrong way, 🚨 emergency.',
    `If a request pulls away from "${project}", do not start it. Save its gist in one line ` +
      `(${saveIdeaHow(ctx, agent)}), say "Saved for later" and offer two options: ` +
      `"Back to ${project}" and "This matters more, do it now". On "do it now", do it without arguing: ` +
      'it is the person\'s call. If they say it is now the main thing, use the focus skill.',
    `Allowed right away, without saving for later: ${focus.allow || DEFAULT_ALLOW}.`,
  ]
  const state = await readState(ctx)
  const offers = (state.offers = state.offers || {})
  let offered = false

  const pending = (await collectDecisions(ctx)).length
  if (pending && offers.decide !== ctx.today) {
    lines.push(`Decisions waiting for the person: ${pending}. If they did not start the session with a ` +
      'specific task, offer "Go through decisions (about 3 min)" and "Later". Use the decide skill.')
    offers.decide = ctx.today
    offered = true
  }

  const ideas = (await ideaLines(ctx)).length
  let stale = true
  if (state.last_review) {
    const b = dayNumber(state.last_review)
    if (b !== null) stale = dayNumber(ctx.today) - b >= REVIEW_EVERY_DAYS
  }
  if (ideas && stale && !offered && offers.review !== ctx.today) {
    lines.push(`Saved for later: ${ideas}, not reviewed for a while. If the person did not start with a ` +
      'specific task, offer "Look at saved items (about 3 min)" and "Later". Use the review skill.')
    offers.review = ctx.today
    offered = true
  }
  if (offered && mark) await writeState(ctx, state)
  lines.push(words(agent))
  lines.push(commandsNote(ctx, agent))
  return lines.join('\n')
}

// --------------------------------------------------------------- commands

async function ensureData(ctx) {
  const created = []
  for (const [name, body] of [['IDEAS.md', IDEAS_TEMPLATE], ['inbox-sources.txt', SOURCES_TEMPLATE]]) {
    if (!(await ctx.io.exists(ctx.f(name)))) {
      await ctx.io.write(ctx.f(name), body)
      created.push(name)
    }
  }
  return created
}

const dump = (data) => JSON.stringify(data, null, 2)

class Usage extends Error {}

// argparse-style options: positionals, --key value, --key=value and flags.
function parse(argv, spec) {
  const out = { _: [] }
  for (const [k, v] of Object.entries(spec)) {
    if (v === 'list') out[k] = []
    else if (v === 'flag') out[k] = false
  }
  for (let i = 0; i < argv.length; i++) {
    const a = String(argv[i])
    if (a.startsWith('--') && a.length > 2) {
      let key = a.slice(2)
      let val
      const eq = key.indexOf('=')
      if (eq >= 0) { val = key.slice(eq + 1); key = key.slice(0, eq) }
      const name = key.replace(/-/g, '_')
      const kind = spec[name]
      if (!kind) throw new Usage(`unknown option --${key}`)
      if (kind === 'flag') { out[name] = true; continue }
      if (val === undefined) {
        if (i + 1 >= argv.length) throw new Usage(`--${key} needs a value`)
        val = String(argv[++i])
      }
      if (kind === 'list') out[name].push(val)
      else if (kind === 'int') {
        if (!/^-?\d+$/.test(val)) throw new Usage(`--${key} needs a number`)
        out[name] = parseInt(val, 10)
      } else out[name] = val
    } else out._.push(a)
  }
  return out
}

async function statusData(ctx) {
  const focus = await readFocus(ctx)
  const state = await readState(ctx)
  return {
    configured: Boolean(focus),
    project: focus ? focus.project ?? null : null,
    finish: focus ? focus.finish ?? null : null,
    since: focus ? focus.since ?? null : null,
    days: focus ? focusDays(ctx, focus) : null,
    allow: focus ? focus.allow ?? null : null,
    decisions_waiting: (await collectDecisions(ctx)).length,
    ideas: (await ideaLines(ctx)).length,
    last_review: state.last_review ?? null,
    sources: await sourcePatterns(ctx),
  }
}

const COMMANDS = {
  async init(ctx) {
    const created = await ensureData(ctx)
    return `Data folder: ${ctx.root}\nCreated: ` + (created.length ? created.join(', ') : 'nothing, all there already')
  },
  async context(ctx, argv) {
    const a = parse(argv, { agent: 'str', format: 'str' })
    return contextText(ctx, a.agent || 'other', (a.format || 'json') === 'json')
  },
  async status(ctx) {
    return dump(await statusData(ctx))
  },
  async health(ctx, argv) {
    const a = parse(argv, { json: 'flag' })
    const h = await health(ctx)
    if (a.json) return dump(h)
    return [`${h.lamp} ${h.headline}`, ...h.reasons.slice(1).map((r) => `  ${LAMP[r.level]} ${r.text}`)].join('\n')
  },
  async setup(ctx, argv) {
    const a = parse(argv, { project: 'str', finish: 'str', allow: 'str', source: 'list', sources_from_scan: 'flag' })
    if (!a.project || a.finish === undefined) throw new Usage('--project and --finish are required')
    await ensureData(ctx)
    await writeFocus(ctx, a.project, a.finish, a.allow)
    const added = []
    for (const p of a.source) if (await addSource(ctx, ctx.expand(p))) added.push(p)
    if (a.sources_from_scan) {
      for (const proj of await scanProjects(ctx)) {
        if (proj.has_state && await addSource(ctx, join(proj.path, 'STATE.md'))) added.push(proj.path)
      }
    }
    return dump({ project: a.project, finish: a.finish, sources_added: added,
      decisions_waiting: (await collectDecisions(ctx)).length })
  },
  async focus(ctx, argv) {
    const a = parse(argv, { set: 'str', finish: 'str', allow: 'str' })
    if (a.set) {
      await writeFocus(ctx, a.set, a.finish || '', a.allow)
      return `Main thing: ${a.set}`
    }
    return dump(await statusData(ctx))
  },
  async idea(ctx, argv) {
    const a = parse(argv, { by: 'str' })
    if (!a._.length) throw new Usage('the idea is missing')
    const line = await addIdea(ctx, a._.join(' '), a.by || 'other')
    return `Saved for later: ${line.slice(2)}`
  },
  async ideas(ctx, argv) {
    const a = parse(argv, { last: 'int', json: 'flag', drop: 'int' })
    if (a.drop) return `Dropped: ${(await dropIdea(ctx, a.drop)).slice(2)}`
    const ideas = await ideaLines(ctx)
    if (a.json) return dump(ideas.map((l, i) => ({ n: i + 1, text: l.slice(2) })))
    if (!ideas.length) return 'Nothing saved.'
    const shown = a.last > 0 ? ideas.slice(-a.last) : ideas
    return shown.map((l, i) => `${i + 1}. ${l.slice(2)}`).join('\n')
  },
  async reviewed(ctx) {
    const state = await readState(ctx)
    state.last_review = ctx.today
    await writeState(ctx, state)
    return `Review marked: ${state.last_review}`
  },
  async decisions(ctx, argv) {
    const a = parse(argv, { json: 'flag' })
    const decisions = await collectDecisions(ctx)
    if (a.json) return dump(decisions)
    if (!decisions.length) return 'No decisions waiting.'
    const out = []
    let project = null
    for (const d of decisions) {
      if (d.project !== project) { project = d.project; out.push(`\n## ${project}`) }
      out.push(`[${d.id}] ${d.question}`)
    }
    return out.join('\n')
  },
  async answer(ctx, argv) {
    const a = parse(argv, {})
    if (a._.length < 2) throw new Usage('a decision id and an answer are required')
    const res = await answerDecision(ctx, a._[0], a._.slice(1).join(' '))
    return `Answer written to project ${res.project}: ${res.line.slice(2)}`
  },
  async scan(ctx) {
    return dump(await scanProjects(ctx))
  },
  async sources(ctx, argv) {
    const a = parse(argv, { add: 'list' })
    for (const p of a.add) await addSource(ctx, ctx.expand(p))
    return dump(await sourcePatterns(ctx))
  },
  async doctor(ctx) {
    const focus = await readFocus(ctx)
    return [
      `helps ${VERSION}`,
      `data: ${ctx.root} (${(await isDir(ctx.io, ctx.root)) ? 'present' : 'missing'})`,
      'main thing: ' + ((focus && focus.project) || 'not set up'),
      `decision sources: ${(await sourcePatterns(ctx)).length}; decisions waiting: ${(await collectDecisions(ctx)).length}`,
    ].join('\n')
  },
}
COMMANDS.inbox = COMMANDS.decisions

export const COMMAND_NAMES = Object.keys(COMMANDS)

// One command, as `helps <args>` on the command line: { code, out, err }.
export async function run(io, args) {
  const argv = (args || []).map(String)
  const name = argv[0]
  if (name === '--version') return { code: 0, out: VERSION, err: '' }
  const fn = COMMANDS[name]
  if (!fn) return { code: 2, out: '', err: `helps: unknown command "${name || ''}". Commands: ${COMMAND_NAMES.join(', ')}` }
  try {
    const ctx = await makeCtx(io)
    return { code: 0, out: await fn(ctx, argv.slice(1)), err: '' }
  } catch (err) {
    return { code: 2, out: '', err: 'helps: ' + String((err && err.message) || err) }
  }
}
