// helps as a Claude Code mod: everything runs inside Claude Code, nothing to install.
// · core.js, the same core the Codex and Gemini wrappers run through Node;
// · the mcp__helps__run tool: the assistant's commands for Claude (args as on the command line);
// · the main thing as a section of the system prompt;
// · the lamp: the state of THIS session (session.js), above the prompt (terminal and desktop)
//   or, where no surface draws that band, in the status line:
//   🟢 on track · 🟡 needs a look · 🔴 needs you · 🚨 emergency (blinks).
//   The person's main thing is shown beside it, dimmed; it does not color the lamp.
// The mod only watches: no hook here may fail or slow down a prompt, a turn or a tool call.
// Buttons send a request on the person's behalf; the "Details" pane lists every reason.

import { run, health as coreHealth, contextText, makeCtx, COMMAND_NAMES, VERSION } from './core.js'
import {
  sessionConfig, bandConfig, BAND_DEFAULTS, TEXT_SIZE, newSessionState, ownerSpoke, ownerPresent, promptFrom, outsideAction, outsideTool, assess,
  headline, duration, redact, DRIFT_SYSTEM, driftPrompt, readDrift, SESSION_DEFAULTS, isNewer, helpsToolNeedsPerson,
} from './session.js'

const PANE = 'helps-lamp'
const TICK_MS = 30_000 // the session's own clock: cheap, no files
const MAIN_EVERY_MS = 5 * 60_000 // the main thing's state: reads files, so not often
const COMMAND_TURN_MS = 15_000 // a slash command that starts a turn does so at once
const TOAST_EVERY_MS = 15 * 60_000 // the same kind of trouble is not announced again sooner
const BLINK_MS = 500
const BLINK_FOR_MS = 60_000 // an alert blinks for a minute, then stays lit
const START_SCAN_MS = 3000 // the first prompt does not wait longer than this for the files
const PAUSED = 'The person pressed Pause in helps. Do not call tools. Say in two sentences where things stand ' +
  'and what is unfinished, then stop and wait for the person.'
const DRIFT_MODEL = 'haiku' // an alias the engine resolves to its current small model
const DRIFT_TIMEOUT_MS = 30_000
// Once every 6 hours helps reads its own published version number; nothing about the person is sent.
const VERSION_URL = 'https://raw.githubusercontent.com/uaskpro/helps/main/plugins/claude/helps/.claude-plugin/plugin.json'
const VERSION_EVERY_MS = 6 * 3600_000
const COLORS = { none: 'gray', green: 'green', yellow: 'yellow', red: 'red', siren: 'red' }
const LAMP = { green: '🟢', yellow: '🟡', red: '🔴', siren: '🚨' }
const RANK = { green: 1, yellow: 2, red: 3, siren: 4 }

let main = { level: 'unknown', headline: '', reasons: [] } // the person's main thing (core health)
let S = null // this session (session.js)
let view = { level: 'green', reasons: [] }
let cfg = { ...SESSION_DEFAULTS }
let band = { ...BAND_DEFAULTS } // how the band looks: config.json "band"
let project = ''
let blinkOn = true
let lastLevel = null
let errorText = null
let contextSection = null
let driftBusy = false
let latest = null // a newer published version, if any
let lastVersionCheck = null
let interactive = true // false under -p and the SDK: nobody is watching, so no model or network calls
let surfaces = [] // where the session draws now
let lastMainAt = null
let refreshing = false
let lastToast = { kind: null, level: null, at: 0 }
let lastDrawn = null // what the status line and the band last showed
let sirenSince = 0
let timers = []
let blinkTimer = null

// Variable names stay literal so `claude plugin validate` can list them.
async function envGet($, name) {
  switch (name) {
    case 'HOME': return $.env.get('HOME')
    case 'USERPROFILE': return $.env.get('USERPROFILE')
    case 'HELPS_DATA': return $.env.get('HELPS_DATA')
    case 'HELPS_TODAY': return $.env.get('HELPS_TODAY')
    case 'HELPS_NOW': return $.env.get('HELPS_NOW')
    case 'HELPS_PROJECT_ROOTS': return $.env.get('HELPS_PROJECT_ROOTS')
    case 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC': return $.env.get('CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC')
    default: return undefined
  }
}

function makeIo($) {
  return {
    read: (p) => $.fs.read(p),
    write: (p, t) => $.fs.write(p, t),
    list: (p) => $.fs.list(p),
    exists: (p) => $.fs.exists(p),
    stat: (p, o) => $.fs.stat(p, o),
    env: (n) => envGet($, n),
    now: () => $.clock.now(),
    cwd: () => $.session.cwd(),
  }
}

const baseName = (p) => String(p || '').replace(/\\/g, '/').replace(/\/+$/, '').split('/').pop() || ''
// The session works on the main thing when its folder is named in it ("helps" in "ship helps 1.0").
const isMain = () => {
  const name = project.toLowerCase()
  const words = String(main.project || '').toLowerCase().split(/[^\p{L}\p{N}_.-]+/u)
  return Boolean(name) && words.includes(name)
}
const bandShown = () => surfaces.includes('terminal') || surfaces.includes('desktop')
// Somebody can see the lamp: only then is a model or network call for it worth making.
const watched = () => surfaces.length > 0
const has = (kind) => view.reasons.some((r) => r.kind === kind)
const clock = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

async function state($) {
  if (!S) S = newSessionState(await $.clock.now())
  return S
}

function line(now, brief = false) {
  if (errorText) return 'helps: could not check — ' + errorText
  return headline(project, view, S, now, brief)
}

// Beside the lamp, dimmed. The brief form leaves the main thing to Details.
function mainNote(brief = false) {
  const update = latest ? (brief ? `update ${latest}` : `update ${latest} available`) : ''
  const note = main.level === 'none' ? 'helps is not set up' : main.project && !brief ? 'main: ' + main.project : ''
  return [note, update].filter(Boolean).join(' · ')
}

async function checkVersion($) {
  if (!cfg.update_check || !watched()) return
  if (await envGet($, 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC')) return
  const now = await $.clock.now()
  if (lastVersionCheck !== null && now - lastVersionCheck < VERSION_EVERY_MS) return
  lastVersionCheck = now
  try {
    const r = await $.http.fetch(VERSION_URL)
    if (!r || !r.ok) return
    const v = JSON.parse(r.text).version
    if (isNewer(v, VERSION) && v !== latest) {
      latest = v
      $.ui.toast(`helps ${v} is out (you have ${VERSION}). Details shows how to update.`)
    }
  } catch { /* offline or blocked: try again later */ }
}

// The main thing's state (files) and the published version. Never throws, never overlaps itself.
async function refresh($) {
  if (refreshing) return
  refreshing = true
  try {
    lastMainAt = await $.clock.now()
    try {
      const ctx = await makeCtx(makeIo($))
      try {
        const raw = JSON.parse(await $.fs.read(ctx.f('config.json')))
        cfg = sessionConfig(raw && raw.session)
        band = bandConfig(raw && raw.band)
      } catch { cfg = sessionConfig(null); band = bandConfig(null) }
      if (ctx.cwd) project = baseName(ctx.cwd)
      main = await coreHealth(ctx)
      errorText = null
    } catch (err) {
      errorText = String((err && err.message) || err).slice(0, 200)
    }
  } catch { /* the lamp never throws */ } finally {
    refreshing = false
  }
  await redraw($)
  checkVersion($).then(() => redraw($)).catch(() => {})
}

// Every 30 seconds: where the session draws, the clocks, and now and then the main thing.
async function tick($) {
  try {
    surfaces = await $.session.surfaces()
    if (!watched()) return // nothing draws here (a script, a cloud session): no files, no calls
    const now = await $.clock.now()
    if (lastMainAt === null || now - lastMainAt >= MAIN_EVERY_MS) return refresh($)
  } catch { /* keep the last answer */ }
  await redraw($)
}

// An alert blinks for a minute, then stays lit. The timer lives only that long.
function startBlink($) {
  sirenSince = Date.now()
  if (blinkTimer) return
  blinkTimer = $.clock.every(BLINK_MS, () => {
    if (view.level === 'siren' && Date.now() - sirenSince < BLINK_FOR_MS) blinkOn = !blinkOn
    else {
      blinkOn = true
      try { blinkTimer.cancel() } catch { /* gone */ }
      blinkTimer = null
    }
    $.ui.invalidate('ui.render')
  })
}

// Cheap: this session's state from what the mod has seen.
async function redraw($) {
  try {
    const s = await state($)
    const now = await $.clock.now()
    try {
      const usage = await $.session.usage()
      s.contextPercent = usage && usage.context && typeof usage.context.percent === 'number' ? usage.context.percent : null
    } catch { /* not reported here */ }
    const sirens = (main.reasons || []).filter((r) => r.kind === 'alert').map((r) => r.text)
    view = assess(s, now, cfg, sirens)
    const top = view.reasons[0]
    // A toast only when the lamp turns red or worse; yellow is for a glance, not an interruption.
    if (lastLevel !== null && RANK[view.level] > RANK[lastLevel] && RANK[view.level] >= RANK.red && top &&
        (top.kind !== lastToast.kind || view.level !== lastToast.level || now - lastToast.at >= TOAST_EVERY_MS)) {
      lastToast = { kind: top.kind, level: view.level, at: now }
      $.ui.toast(LAMP[view.level] + ' ' + top.text)
    }
    if (view.level === 'siren' && lastLevel !== 'siren') startBlink($)
    lastLevel = view.level
    const text = (view.level === 'siren' ? '🚨 EMERGENCY · ' : LAMP[view.level] + ' ') + line(now) + (mainNote() ? ' · ' + mainNote() : '')
    const drawn = `${bandShown()}|${band.size}/${band.layout}|${text}|${buttonKeys().join(',')}`
    if (drawn === lastDrawn) return // nothing a person would see has changed
    lastDrawn = drawn
    // Where the band above the prompt is drawn, the status line would only repeat it.
    $.ui.status(bandShown() ? undefined : text.slice(0, 300))
    $.ui.invalidate('ui.render')
  } catch { /* the lamp never throws */ }
}

async function checkDrift($) {
  const s = await state($)
  if (driftBusy || !watched() || !cfg.drift_check || s.paused || !s.asks.length || !s.lastAnswer) return
  const now = await $.clock.now()
  if (s.turnsSinceDrift < cfg.drift_every_turns || (s.lastDriftAt && now - s.lastDriftAt < cfg.drift_every_min * 60000)) return
  driftBusy = true
  s.turnsSinceDrift = 0
  s.lastDriftAt = now
  try {
    const gen = s.gen
    const r = await $.model.complete({ model: DRIFT_MODEL, system: DRIFT_SYSTEM, prompt: driftPrompt(s), maxTokens: 150, timeoutMs: DRIFT_TIMEOUT_MS })
    if (r && r.isAnswered && s.gen === gen && S === s) {
      const d = readDrift(r.text)
      if (d) s.drift = { ...d, at: now }
    }
  } catch { /* no verdict this time */ } finally {
    driftBusy = false
  }
  await redraw($)
}

// A button sends a request as the person. It is queued and starts a turn once the session is idle, so
// nothing here waits for it. Pressing a button also means the person is here.
function ask($, text) {
  $.clock.now().then((now) => { if (S) ownerPresent(S, now) }).catch(() => {})
  $.prompt.submit({ text, asUser: true }).catch((err) => {
    $.ui.toast('helps: ' + String((err && err.message) || err).slice(0, 120))
  })
}

const ASKS = {
  report: 'Briefly list what you did since my last message: outside actions first (servers, pushes, merges, ' +
    'deploys), then anything you did not verify. Then wait for me.',
  stuck: 'You look stuck. Stop retrying. In two sentences: what is failing, why, and what you need from me.',
  drift: 'Before you go on: in two sentences, what did I last ask for, and how does what you are doing now serve it?',
  back: 'Let\'s get back to the main thing. What is it now and where did we stop?',
  decide: 'Let\'s go through the decisions waiting for me, one by one.',
  setup: 'Set up the helps assistant with me.',
}

// "Realign": the session checks itself against the project's own rules, says where it left them, puts
// its process right and carries on. What the lamp recorded goes along as evidence.
function realignText(s) {
  const own = s.outside.filter((o) => !o.asked).slice(-10).map((o) => `${clock(o.at)} ${o.label}`)
  const facts = []
  if (own.length) facts.push(`In turns you started yourself since my last message, helps recorded these outside actions: ${own.join('; ')}.`)
  if (s.drift && s.drift.onTrack === false && s.drift.reason) facts.push(`A drift check noted: ${s.drift.reason}.`)
  return [
    'Check your course before you do anything else.',
    '1. Re-read this project\'s rules: CLAUDE.md or AGENTS.md, the documents they tell you to read, and STATE.md if there is one.',
    '2. Compare what you have done since my last message with those rules and with what I asked for. List every ' +
      'place you left them, shortly: reviews, checks or tests skipped or cut; merges, pushes, deploys or server changes ' +
      'I did not ask for; work outside the task; claims you did not verify.',
    ...(facts.length ? ['3. ' + facts.join(' ') + ' Say for each whether the rules allowed it.'] : []),
    `${facts.length ? 4 : 3}. For each item say in one line how you put it right, then put your process right and carry on with the work as the rules say.`,
  ].join('\n')
}

// Every button that makes sense now: [key, label, what it does].
function allButtons() {
  const b = []
  if (S && S.paused) b.push(['helps-resume', 'Resume', 'resume'])
  if (main.level !== 'none') b.push(['helps-realign', 'Realign', 'realign'])
  if (main.level === 'none') b.push(['helps-setup', 'Set up helps', 'setup'])
  if (has('outside') || has('alone')) b.push(['helps-report', 'What did you do without me?', 'report'])
  if (has('stuck')) b.push(['helps-stuck', 'What\'s wrong?', 'stuck'])
  if (has('drift')) b.push(['helps-drift', 'Check with me', 'drift'])
  if (!(S && S.paused) && (has('outside') || has('alone') || has('stuck') || has('drift'))) b.push(['helps-pause', 'Pause', 'pause'])
  if (isMain()) {
    if (main.level !== 'green' && main.level !== 'none' && main.level !== 'unknown') b.push(['helps-back', 'Back to the main thing', 'back'])
    if ((main.reasons || []).some((r) => r.kind === 'decisions')) b.push(['helps-decide', 'Go through decisions', 'decide'])
  }
  b.push(['helps-more', 'Details', 'details'])
  return b
}
// The band: all of them, or in the "lamp" layout only what cannot wait behind Details.
const ON_LAMP = ['resume', 'setup', 'details']
const buttonList = () => (band.layout === 'lamp' ? allButtons().filter((b) => ON_LAMP.includes(b[2])) : allButtons())
const buttonKeys = () => buttonList().map((b) => b[0])

function press($, what) {
  if (what === 'details') {
    $.ui.open({ id: PANE, title: 'helps', focus: true, closeOnEscape: true }).catch(() => {})
  } else if (what === 'pause' || what === 'resume') {
    // Pause works at once, in the middle of a turn too: from now on tool calls are refused.
    $.clock.now().then((now) => {
      if (!S) return
      ownerPresent(S, now)
      S.paused = what === 'pause'
      if (what === 'pause') $.ui.toast('helps: paused. The session stops at its next step; write to it to go on.')
      return redraw($)
    }).catch(() => {})
  } else if (what === 'realign') {
    // The evidence is taken first; then the person has spoken, and the count starts over.
    const text = S ? realignText(S) : ''
    $.clock.now().then((now) => { if (S) ownerSpoke(S, '', now); return redraw($) }).catch(() => {})
    if (text) $.prompt.submit({ text, asUser: true }).catch((err) => {
      $.ui.toast('helps: ' + String((err && err.message) || err).slice(0, 120))
    })
  } else ask($, ASKS[what])
}

function buttons($, Button, Text, size) {
  return buttonList().map(([key, label, what]) => Button({
    key, label, plain: true, onPress: () => press($, what),
    ...(size ? { children: [Text({ size, children: [label] })] } : {}),
  }))
}

// In Details: the same buttons under their own keys. One that sends a message closes the pane.
function paneButtons($, Button) {
  return allButtons().filter((b) => b[2] !== 'details').map(([key, label, what]) => Button({
    key: 'pane-' + key, label,
    onPress: () => {
      press($, what)
      if (what !== 'pause' && what !== 'resume') $.ui.close({ id: PANE }).catch(() => {})
    },
  }))
}

const WRITE_IT = 'Write it'
let confirming = 0 // helps' own "write this answer?" dialogs open now: their replies earn no credit

// Null when the answer may be written: the person has just answered with buttons, or says yes now.
// Otherwise the text the model gets instead of a write.
async function confirmAnswer($, args) {
  try {
    const s = await state($)
    if (!helpsToolNeedsPerson(args, s, await $.clock.now())) return null
    const list = await run(makeIo($), ['decisions', '--json'])
    const dec = list.code === 0 ? JSON.parse(list.out).find((d) => d.id === args[1]) : null
    if (!dec) return null // nothing to write: the core says so itself
    const clip = (t, n) => { const x = String(t).replace(/\s+/g, ' ').trim(); return x.length > n ? x.slice(0, n - 1) + '…' : x }
    confirming++
    let choice
    try {
      choice = await $.ui.ask(
        `Project ${clip(dec.project, 40)} asks: "${clip(dec.question, 140)}" Write "${clip(args.slice(2).join(' '), 140)}" into its file as your answer?`,
        { header: 'helps', options: [WRITE_IT, 'Do not write'] })
    } finally { confirming-- }
    if (choice === WRITE_IT) return null
  } catch { /* dismissed, or nobody to ask (a script) */ }
  return 'helps: not written. The person did not confirm this answer. Ask them the question itself with the ' +
    'question dialog and write only the answer they pick; never answer for them.'
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    project = baseName(e.cwd)
    interactive = e.isInteractive !== false
    surfaces = e.surface ? [e.surface] : []
    for (const t of timers.concat(blinkTimer || [])) { try { t.cancel() } catch { /* gone */ } } // session.start can run again
    timers = []
    blinkTimer = null
    await state($)
    try {
      await $.tool.register({
        name: 'run',
        description: 'The helps assistant: the person\'s main thing, ideas saved for later, decisions waiting ' +
          'for them. args are what follows the word helps: ["status"], ["idea", "<gist>", "--by", "claude"], ' +
          '["setup", "--project", "…", "--finish", "…", "--sources-from-scan"], ["focus", "--set", "…", "--finish", "…"], ' +
          '["ideas", "--json"], ["ideas", "--drop", "N"], ["reviewed"], ["decisions", "--json"], ' +
          '["answer", "<id>", "<answer>"], ["scan"], ["health"]. Never show these commands to the person.',
        inputSchema: {
          type: 'object',
          properties: {
            args: { type: 'array', items: { type: 'string' }, minItems: 1,
              description: 'The command and its arguments: ' + COMMAND_NAMES.join(', ') },
          },
          required: ['args'],
        },
        isDeferred: false,
      })
    } catch (err) {
      $.ui.toast('helps: the tool did not register — ' + String((err && err.message) || err).slice(0, 120))
    }
    // The session's standing instructions. A scripted run (-p, the SDK) does not use up today's offers.
    // Slow disks do not hold the first prompt: past three seconds the section arrives when it is ready.
    const section = (async () => contextText(await makeCtx(makeIo($)), 'claude', interactive || surfaces.length > 0))()
      .then((text) => { contextSection = text }, () => { /* never break the session start */ })
    await Promise.race([section, new Promise((done) => $.clock.after(START_SCAN_MS, done))])
    timers.push($.clock.every(TICK_MS, () => { tick($) }))
    refresh($)
    try {
      await $.command.register({ name: 'helps-lamp', description: 'helps: why the lamp has this color' })
    } catch (err) {
      // the name is taken; the "Details" button still opens the pane
    }
    return next(e)
  })

  // /clear ends the conversation without a new session.start: start this session's count over.
  on('session.end', async ($, e, next) => {
    try {
      if (e.reason === 'clear' || e.reason === 'resume') {
        S = newSessionState(await $.clock.now())
        lastLevel = null
        await redraw($)
      }
    } catch { /* never block /clear */ }
    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const res = await next(e)
    try {
      // A teammate renders its lead's prompt for a delegated task; a /context measurement sends nothing.
      if (!contextSection || !res || !Array.isArray(res.sections) || (e.traits || []).includes('teammate')) return res
      if (res.sections.some((sec) => sec.id === 'helps:focus')) return res
      return { ...res, sections: [...res.sections, { id: 'helps:focus', text: contextSection, scope: 'session' }] }
    } catch { return res }
  })

  // The person speaks: everything counted as the session's own doing starts over.
  on('prompt.submit', async ($, e, next) => {
    try {
      const from = promptFrom(e)
      if (from !== 'other') {
        const s = await state($)
        const now = await $.clock.now()
        if (from === 'owner') ownerSpoke(s, e.text, now)
        else ownerPresent(s, now)
        // Typed over a running turn, the rest of that turn answers the person; typed while idle, the next
        // one does. A slash command may start no turn at all, so its claim on the next turn lapses quickly.
        if (e.turnId) s.inOwnerTurn = true
        else s.awaitingUntil = from === 'command' ? now + COMMAND_TURN_MS : Infinity
        await redraw($)
      }
    } catch { /* never block a prompt */ }
    return next(e)
  })

  // A main-loop turn the person started answers the person; any other turn is the session's own.
  on('turn.start', async ($, e, next) => {
    try {
      const s = await state($)
      const now = await $.clock.now()
      s.lastActivityAt = now
      if (e.agentId === undefined) {
        s.inOwnerTurn = s.awaitingUntil !== null && now <= s.awaitingUntil
        s.awaitingUntil = null
        if (!s.inOwnerTurn && s.autoSince === null) s.autoSince = now
      }
    } catch { /* ignore */ }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const res = await next(e)
    try {
      if (e.agentId === undefined) {
        const s = await state($)
        s.lastActivityAt = await $.clock.now()
        s.lastAnswer = String(e.answer || (res && res.text) || '')
        s.inOwnerTurn = false
        s.awaitingUntil = null
        s.turnsSinceDrift++
        $.clock.after(0, () => checkDrift($).catch(() => {}))
        await redraw($)
      }
    } catch { /* the lamp never breaks a turn */ }
    return res
  })

  // Every tool call, subagents' included: what goes outside, what keeps failing, what hangs.
  // Whatever happens in here, the call itself goes through untouched.
  on('tool.call', async ($, e, next) => {
    let s = null
    let label = null
    let key = null
    let asked = false
    try {
      s = await state($)
      const now = await $.clock.now()
      s.lastActivityAt = now
      if (e.agentId !== undefined && !s.seenAgents.has(e.agentId)) {
        s.seenAgents.add(e.agentId) // a subagent the person's own turn spawned works at the person's word
        if (s.inOwnerTurn) s.ownerAgents.add(e.agentId)
      }
      asked = e.agentId === undefined ? s.inOwnerTurn === true : s.ownerAgents.has(e.agentId)
      // Paused by the person: nothing runs until they speak. Questions to them and helps itself still do.
      if (s.paused && e.tool !== 'AskUserQuestion' && e.tool !== 'mcp__helps__run') return { deny: PAUSED }
      if (e.tool === 'Bash' && typeof e.command === 'string') {
        label = outsideAction(e.command)
        key = e.command.replace(/\s+/g, ' ').trim().slice(0, 200)
        s.recent = s.recent.concat([redact(e.command).slice(0, 300)]).slice(-12)
        if (e.tool_use_id) s.running.set(e.tool_use_id, { cmd: e.command.slice(0, 300), start: now })
      }
    } catch { /* observing only */ }
    let res
    try {
      res = await next(e)
    } finally {
      try { if (s && e.tool_use_id) s.running.delete(e.tool_use_id) } catch { /* observing only */ }
    }
    try {
      if (s) {
        const end = await $.clock.now()
        s.lastActivityAt = end
        const denied = !res || Boolean(res.deny)
        const failed = !denied && res.isError === true
        let changed = false
        const answered = e.tool === 'AskUserQuestion' && !denied && !failed &&
          !(res.result && typeof res.result === 'object' && res.result.afkTimeoutMs)
        if (answered && confirming > 0) {
          ownerPresent(s, end) // helps' own yes/no: the person is here, and that is all it says
          changed = true
        } else if (answered) {
          ownerSpoke(s, res.text ? 'Answers: ' + String(res.text).slice(0, 600) : '', end)
          if (e.agentId === undefined) s.inOwnerTurn = true // the rest of this turn acts on the person's answer
          const answers = res.result && typeof res.result === 'object' && res.result.answers
          const count = answers && typeof answers === 'object' ? Object.keys(answers).length : 1
          s.answerCredits = Math.min(8, (end - s.answerCreditsAt > 30 * 60000 ? 0 : s.answerCredits) + Math.max(1, count))
          s.answerCreditsAt = end
          changed = true
        }
        if (!key && !denied && !failed) label = outsideTool(e.tool, res.isReadOnly)
        if (key && !denied) {
          if (failed) {
            if (s.fail.key === key) s.fail.count++
            else s.fail = { key, count: 1, cmd: e.command.slice(0, 300) }
            changed = true
          } else if (s.fail.key) {
            s.fail = { key: null, count: 0, cmd: '' }
            changed = true
          }
        }
        if (label && !denied) {
          s.outside = s.outside.concat([{ label, at: end, asked }]).slice(-50)
          changed = true
        }
        if (changed) await redraw($)
      }
    } catch { /* observing only */ }
    return res
  })

  on('tool.call', { tool: 'mcp__helps__run' }, async ($, e) => {
    const args = Array.isArray(e.args) ? e.args.map(String) : []
    // The engine asks no permission for a tool a mod serves itself, so the one write that needs the
    // person is checked here: an answer goes into a project only with the person's hand on it.
    if (args[0] === 'answer') {
      const refusal = await confirmAnswer($, args)
      if (refusal) return { isError: true, result: refusal }
    }
    const r = await run(makeIo($), args)
    if (args[0] === 'doctor' && r.code === 0) {
      // Where this session draws: the lamp band shows on terminal and desktop only.
      try { surfaces = await $.session.surfaces() } catch { /* keep the last answer */ }
      let panes = []
      try { panes = await $.ui.panes() } catch { /* none */ }
      r.out += `\nsurfaces: ${surfaces.length ? surfaces.join(', ') : 'none'}` +
        `\ninteractive: ${interactive ? 'yes' : 'no'}; lamp shown in: ${bandShown() ? 'the band above the prompt' : surfaces.length ? 'the status line' : 'nowhere (no surface draws plugin UI here)'}` +
        `\nsession: ${project || '?'}, lamp ${view.level}${view.reasons.length ? ' (' + view.reasons.map((x) => x.text).join('; ') + ')' : ''}` +
        `\nmain thing: level ${main.level}, ${errorText ? 'error ' + errorText : 'ok'}` +
        `\npanes: ${panes.length ? panes.map((p) => p.id + (p.isPlaced ? ' (placed)' : ' (not placed)')).join(', ') : 'none'}`
    }
    if (r.code === 0 && args[0] === 'answer' && S && S.answerCredits > 0) S.answerCredits--
    if (r.code === 0 && (args[0] === 'setup' || (args[0] === 'focus' && args.includes('--set')))) {
      // The main thing changed: the session's standing instructions follow it.
      try { contextSection = await contextText(await makeCtx(makeIo($)), 'claude', false) } catch { /* keep the old one */ }
    }
    refresh($)
    if (r.code !== 0) return { isError: true, result: r.err || 'helps: error' }
    return { result: typeof r.out === 'string' && r.out ? r.out : 'done' }
  })

  on('command.run', { command: 'helps-lamp' }, async ($) => {
    await refresh($)
    await $.ui.open({ id: PANE, title: 'helps', focus: true, closeOnEscape: true })
    return {}
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    if (e.props && e.props.hasSurvey) return theirs // a survey holds the band: yield to it
    const { Box, Text, Button } = $.ui.resolve(e)
    const now = await $.clock.now()
    await state($)
    const siren = view.level === 'siren'
    const size = TEXT_SIZE[band.size]
    const brief = band.layout === 'lamp'
    const sized = size ? { size } : {}
    const dot = Text({
      ...sized,
      color: siren && !blinkOn ? undefined : COLORS[view.level],
      dimColor: siren && !blinkOn ? true : undefined,
      inverse: siren && blinkOn ? true : undefined,
      weight: 'semibold',
      children: [siren ? ' 🚨 EMERGENCY ' : '● '],
    })
    const head = Box({ flexDirection: 'row', flexShrink: 1, children: [dot, Text({ ...sized, wrap: 'truncate-end', color: siren ? 'red' : undefined, children: [line(now, brief)] })] })
    const note = mainNote(brief) ? [Text({ ...sized, dimColor: true, wrap: 'truncate-end', children: [mainNote(brief)] })] : []
    const row = buttons($, Button, Text, size)
    const ours = band.layout === 'full'
      ? Box({
        flexDirection: 'column',
        children: [Box({ flexDirection: 'row', columnGap: 2, children: [head, ...note] }), Box({ flexDirection: 'row', flexWrap: 'wrap', columnGap: 2, children: row })],
      })
      : Box({ flexDirection: 'row', flexWrap: 'wrap', columnGap: 2, children: [head, ...note, ...row] })
    if (!theirs) return ours
    return Box({ flexDirection: 'column', children: [ours, theirs] })
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const s = await state($)
    const now = await $.clock.now()
    const rows = []
    const t = (key, text, props = {}) => rows.push(Text({ key, ...props, children: [text] }))
    t('h1', `${LAMP[view.level]} This session: ${project || '?'}`, { weight: 'semibold' })
    if (!view.reasons.length) t('ok', 'On track.')
    view.reasons.forEach((r, i) => t('r' + i, (r.level === 'siren' ? '🚨 ' : '● ') + r.text, { color: COLORS[r.level] }))
    t('since', `Your last message: ${duration(now - s.lastOwnerAt)} ago (${clock(s.lastOwnerAt)})`, { dimColor: true })
    if (s.contextPercent != null) t('ctx', `Context: ${Math.round(s.contextPercent)}%`, { dimColor: true })
    if (s.autoSince !== null) t('auto', `On its own since ${clock(s.autoSince)} (turns it started itself)`, { dimColor: true })
    if (s.outside.length) {
      t('oh', 'Outside actions since your last message:', { dimColor: true })
      s.outside.slice(-8).forEach((o, i) => t('o' + i, `  ${clock(o.at)}  ${o.label}${o.asked ? '  (in reply to you)' : '  (on its own)'}`, { dimColor: true }))
    }
    if (s.drift) t('drift', `Drift check ${clock(s.drift.at)}: ${s.drift.onTrack ? 'on track' : 'drifting'}${s.drift.reason ? ' — ' + s.drift.reason : ''}`, { dimColor: true })
    else if (cfg.drift_check) t('drift', 'Drift check: not run yet', { dimColor: true })
    const acts = paneButtons($, Button)
    if (acts.length) rows.push(Box({ key: 'acts', flexDirection: 'row', flexWrap: 'wrap', columnGap: 2, children: acts }))
    t('sep', ' ')
    if (s.paused) t('paused', 'Paused by you: tool calls are refused until you write to the session or press Resume.', { color: 'yellow' })
    if (main.level === 'none') t('m0', 'Main thing: helps is not set up.', { weight: 'semibold' })
    else if (main.level === 'unknown') t('m0', 'Main thing: checking…', { dimColor: true })
    else {
      t('m0', `Main thing: ${main.project || '?'}` + (main.finish ? ` · done when: ${main.finish}` : ''), { weight: 'semibold' })
      if (!(main.reasons || []).length) t('m1', 'On track.', { dimColor: true })
      ;(main.reasons || []).forEach((r, i) => t('m' + (i + 2), '· ' + r.text, { dimColor: true }))
    }
    if (latest) {
      t('u0', ' ')
      t('u1', `helps ${latest} is out; you have ${VERSION}.`, { weight: 'semibold' })
      t('u2', 'Installed from claude.ai: Customize → Plugins → helps → Update, then start a new session.', { dimColor: true })
      t('u3', 'Installed with /plugin: /plugin → Installed → helps → Update now, then /reload-plugins.', { dimColor: true })
      t('u4', 'To get updates by themselves: /plugin → Marketplaces → uaskpro-helps → Enable auto-update.', { dimColor: true })
    }
    t('legend', '🟢 on track · 🟡 needs a look · 🔴 needs you · 🚨 emergency · Esc to close', { dimColor: true })
    return Box({ flexDirection: 'column', rowGap: 0, children: rows })
  })
}
