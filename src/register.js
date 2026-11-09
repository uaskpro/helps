// helps as a Claude Code mod: everything runs inside Claude Code, nothing to install.
// · core.js, the same core the Codex and Gemini wrappers run through Node;
// · the mcp__helps__run tool: the assistant's commands for Claude (args as on the command line);
// · the main thing as a section of the system prompt;
// · the lamp: the state of THIS session (session.js), above the prompt (terminal and desktop)
//   and in the status line: 🟢 on track · 🟡 needs a look · 🔴 needs you · 🚨 emergency (blinks).
//   The person's main thing is shown beside it, dimmed; it no longer colors the lamp.
// Buttons send a request on the person's behalf; the "Details" pane lists every reason.

import { run, health as coreHealth, contextText, makeCtx, COMMAND_NAMES, VERSION } from './core.js'
import {
  sessionConfig, newSessionState, ownerSpoke, outsideAction, assess, headline, duration,
  DRIFT_SYSTEM, driftPrompt, readDrift, SESSION_DEFAULTS, isNewer, isOwnerPrompt,
} from './session.js'

const PANE = 'helps-lamp'
const POLL_MS = 30_000
const BLINK_MS = 500
const DRIFT_MODEL = 'haiku' // an alias the engine resolves to its current small model
const DRIFT_TIMEOUT_MS = 30_000
// Once every 6 hours helps reads its own published version number; nothing about the person is sent.
const VERSION_URL = 'https://raw.githubusercontent.com/uaskpro/helps/main/plugins/claude/helps/.claude-plugin/plugin.json'
const VERSION_EVERY_MS = 6 * 3600_000
const COLORS = { none: 'gray', green: 'green', yellow: 'yellow', red: 'red', siren: 'red' }
const LAMP = { green: '🟢', yellow: '🟡', red: '🔴', siren: '🚨' }
const RANK = { green: 1, yellow: 2, red: 3, siren: 4 }

let main = { level: 'none', headline: 'checking…', reasons: [] } // the person's main thing (core health)
let S = null // this session (session.js)
let view = { level: 'green', reasons: [] }
let cfg = { ...SESSION_DEFAULTS }
let project = ''
let blinkOn = true
let lastLevel = null
let errorText = null
let contextSection = null
let driftBusy = false
let latest = null // a newer published version, if any
let lastVersionCheck = null

// Variable names stay literal so `claude plugin validate` can list them.
async function envGet($, name) {
  switch (name) {
    case 'HOME': return $.env.get('HOME')
    case 'USERPROFILE': return $.env.get('USERPROFILE')
    case 'HELPS_DATA': return $.env.get('HELPS_DATA')
    case 'HELPS_TODAY': return $.env.get('HELPS_TODAY')
    case 'HELPS_NOW': return $.env.get('HELPS_NOW')
    case 'HELPS_PROJECT_ROOTS': return $.env.get('HELPS_PROJECT_ROOTS')
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
const isMain = () => Boolean(main.project) && project.toLowerCase() === String(main.project).toLowerCase()
const has = (kind) => view.reasons.some((r) => r.kind === kind)
const clock = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

async function state($) {
  if (!S) S = newSessionState(await $.clock.now())
  return S
}

function line(now) {
  if (errorText) return 'helps: could not check — ' + errorText
  return headline(project, view, S, now)
}

function mainNote() {
  const update = latest ? `update ${latest} available` : ''
  const note = main.level === 'none' ? 'helps is not set up' : main.project ? 'main: ' + main.project : ''
  return [note, update].filter(Boolean).join(' · ')
}

async function checkVersion($) {
  if (!cfg.update_check) return
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

async function refresh($) {
  try { await refreshNow($) } catch { /* the lamp never throws */ }
}

async function refreshNow($) {
  try {
    const ctx = await makeCtx(makeIo($))
    try {
      const raw = JSON.parse(await $.fs.read(ctx.f('config.json')))
      cfg = sessionConfig(raw && raw.session)
    } catch { cfg = sessionConfig(null) }
    main = await coreHealth(ctx)
    errorText = null
  } catch (err) {
    errorText = String((err && err.message) || err).slice(0, 200)
  }
  await checkVersion($)
  await redraw($)
}

// Cheap: this session's state from what the mod has seen; runs after every event.
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
    if (lastLevel !== null && RANK[view.level] > RANK[lastLevel]) {
      $.ui.toast(LAMP[view.level] + ' ' + (view.reasons[0] ? view.reasons[0].text : 'helps'))
    }
    lastLevel = view.level
    $.ui.status((view.level === 'siren' ? '🚨 EMERGENCY · ' : LAMP[view.level] + ' ') + line(now) +
      (mainNote() ? ' · ' + mainNote() : ''))
    $.ui.invalidate('ui.render')
  } catch { /* the lamp never throws */ }
}

async function checkDrift($) {
  const s = await state($)
  if (driftBusy || !cfg.drift_check || !s.asks.length || !s.lastAnswer) return
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

async function ask($, text) {
  try {
    await $.prompt.submit({ text, asUser: true })
  } catch (err) {
    $.ui.toast('helps: ' + String((err && err.message) || err).slice(0, 120))
  }
}

const ASKS = {
  report: 'Briefly list what you did since my last message: outside actions first (servers, pushes, merges, ' +
    'deploys), then anything you did not verify. Then wait for me.',
  pause: 'Stop after the current step and wait for me. Do not start new work and do not deploy anything until I answer.',
  stuck: 'You look stuck. Stop retrying. In two sentences: what is failing, why, and what you need from me.',
  drift: 'Before you go on: in two sentences, what did I last ask for, and how does what you are doing now serve it?',
  back: 'Let\'s get back to the main thing. What is it now and where did we stop?',
  decide: 'Let\'s go through the decisions waiting for me, one by one.',
  setup: 'Set up the helps assistant with me.',
}

function buttons($, Button) {
  const b = []
  const add = (key, label, text) => b.push(Button({ key, label, plain: true, onPress: () => ask($, ASKS[text]) }))
  if (main.level === 'none') add('helps-setup', 'Set up helps', 'setup')
  if (has('outside') || has('alone')) add('helps-report', 'What did you do without me?', 'report')
  if (has('stuck')) add('helps-stuck', 'What\'s wrong?', 'stuck')
  if (has('drift')) add('helps-drift', 'Check with me', 'drift')
  if (view.level !== 'green') add('helps-pause', 'Pause after this step', 'pause')
  if (isMain()) {
    if (main.level !== 'green' && main.level !== 'none') add('helps-back', 'Back to the main thing', 'back')
    if ((main.reasons || []).some((r) => r.kind === 'decisions')) add('helps-decide', 'Go through decisions', 'decide')
  }
  b.push(Button({ key: 'helps-more', label: 'Details', plain: true,
    onPress: async () => { await $.ui.open({ id: PANE, title: 'helps', focus: true, closeOnEscape: true }) } }))
  return b
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    project = baseName(e.cwd)
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
    try {
      contextSection = await contextText(await makeCtx(makeIo($)), 'claude', true)
    } catch (err) {
      contextSection = null // never break the session start
    }
    $.clock.every(POLL_MS, () => refresh($))
    $.clock.every(BLINK_MS, () => {
      if (view.level === 'siren') {
        blinkOn = !blinkOn
        $.ui.invalidate('ui.render')
      } else if (!blinkOn) {
        blinkOn = true
      }
    })
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
      if (e.reason === 'clear') {
        S = newSessionState(await $.clock.now())
        lastLevel = null
        await redraw($)
      }
    } catch { /* never block /clear */ }
    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const res = await next(e)
    if (!contextSection) return res
    return { sections: [...res.sections, { id: 'helps:focus', text: contextSection, scope: 'session' }] }
  })

  // The person speaks: everything counted "without your word" starts over.
  on('prompt.submit', async ($, e, next) => {
    try {
      if (isOwnerPrompt(e)) {
        const s = await state($)
        ownerSpoke(s, e.text, await $.clock.now())
        // Typed over a running turn, the rest of that turn answers the person; typed while idle, the next one does.
        if (e.turnId) s.inOwnerTurn = true
        else s.awaitingOwnerTurn = true
        await redraw($)
      }
    } catch { /* never block a prompt */ }
    return next(e)
  })

  // A main-loop turn the owner started (by a message) answers the owner; any other turn is the session's own.
  on('turn.start', async ($, e, next) => {
    try {
      const s = await state($)
      s.lastActivityAt = await $.clock.now()
      if (e.agentId === undefined) {
        s.inOwnerTurn = s.awaitingOwnerTurn === true
        s.awaitingOwnerTurn = false
      }
    } catch { /* ignore */ }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const res = await next(e)
    if (e.agentId === undefined) {
      try {
        const s = await state($)
        s.lastActivityAt = await $.clock.now()
        s.lastAnswer = String(e.answer || res.text || '')
        s.inOwnerTurn = false
        s.awaitingOwnerTurn = false
        s.turnsSinceDrift++
        $.clock.after(0, () => checkDrift($))
        await redraw($)
      } catch { /* the lamp never breaks a turn */ }
    }
    return res
  })

  // Every tool call, subagents' included: what goes outside, what keeps failing, what hangs.
  on('tool.call', async ($, e, next) => {
    let s = null
    let label = null
    let key = null
    try {
      s = await state($)
      const now = await $.clock.now()
      s.lastActivityAt = now
      if (e.tool === 'Bash' && typeof e.command === 'string') {
        label = outsideAction(e.command)
        key = e.command.replace(/\s+/g, ' ').trim().slice(0, 200)
        s.recent = s.recent.concat([e.command]).slice(-12)
        if (e.tool_use_id) s.running.set(e.tool_use_id, { cmd: e.command, start: now })
      }
    } catch { /* observing only */ }
    let res
    try {
      res = await next(e)
    } finally {
      if (s && e.tool_use_id) s.running.delete(e.tool_use_id)
    }
    try {
      if (s) {
        const end = await $.clock.now()
        s.lastActivityAt = end
        const denied = !res || Boolean(res.deny)
        const failed = !denied && res.isError === true
        const answered = e.tool === 'AskUserQuestion' && !denied && !failed &&
          !(res.result && typeof res.result === 'object' && res.result.afkTimeoutMs)
        if (answered) {
          ownerSpoke(s, res.text ? 'Answers: ' + String(res.text).slice(0, 600) : '', end)
          s.inOwnerTurn = true // the rest of this turn acts on the person's answer
        }
        if (key) {
          if (denied) {
            // a refused or interrupted call is not the command failing
          } else if (failed) {
            if (s.fail.key === key) s.fail.count++
            else s.fail = { key, count: 1, cmd: e.command }
          } else if (s.fail.key) {
            s.fail = { key: null, count: 0, cmd: '' }
          }
          if (label && !denied) s.outside.push({ label, at: end, asked: s.inOwnerTurn === true })
        }
        await redraw($)
      }
    } catch { /* observing only */ }
    return res
  })

  on('tool.call', { tool: 'mcp__helps__run' }, async ($, e) => {
    const args = Array.isArray(e.args) ? e.args : []
    const r = await run(makeIo($), args)
    if (args[0] === 'doctor' && r.code === 0) {
      // Where this session draws: the lamp band shows on terminal and desktop only.
      const surfaces = await $.session.surfaces()
      const panes = await $.ui.panes()
      r.out += `\nsurfaces: ${surfaces.length ? surfaces.join(', ') : 'none'}` +
        `\nsession: ${project || '?'}, lamp ${view.level}${view.reasons.length ? ' (' + view.reasons.map((x) => x.text).join('; ') + ')' : ''}` +
        `\nmain thing: level ${main.level}, ${errorText ? 'error ' + errorText : 'ok'}` +
        `\npanes: ${panes.length ? panes.map((p) => p.id + (p.isPlaced ? ' (placed)' : ' (not placed)')).join(', ') : 'none'}`
    }
    refresh($)
    if (r.code !== 0) return { isError: true, result: r.err || 'helps: error' }
    return { result: r.out || 'done' }
  })

  // The tool only writes the assistant's own data and the state files the person chose at setup.
  on('tool.check', { tool: 'mcp__helps__run' }, () => ({ decision: 'allow' }))

  on('command.run', { command: 'helps-lamp' }, async ($) => {
    await refresh($)
    await $.ui.open({ id: PANE, title: 'helps', focus: true, closeOnEscape: true })
    return {}
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const theirs = await next(e)
    const now = await $.clock.now()
    await state($)
    const siren = view.level === 'siren'
    const dot = Text({
      color: siren && !blinkOn ? undefined : COLORS[view.level],
      dimColor: siren && !blinkOn ? true : undefined,
      inverse: siren && blinkOn ? true : undefined,
      weight: 'semibold',
      children: [siren ? ' 🚨 EMERGENCY ' : '● '],
    })
    const top = Box({
      flexDirection: 'row',
      columnGap: 2,
      children: [
        Box({ flexDirection: 'row', flexShrink: 1, children: [dot, Text({ wrap: 'truncate-end', color: siren ? 'red' : undefined, children: [line(now)] })] }),
        Text({ dimColor: true, wrap: 'truncate-end', children: [mainNote()] }),
      ],
    })
    const ours = Box({
      flexDirection: 'column',
      children: [top, Box({ flexDirection: 'row', columnGap: 2, children: buttons($, Button) })],
    })
    if (!theirs) return ours
    return Box({ flexDirection: 'column', children: [ours, theirs] })
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const s = await state($)
    const now = await $.clock.now()
    const rows = []
    const t = (key, text, props = {}) => rows.push(Text({ key, ...props, children: [text] }))
    t('h1', `${LAMP[view.level]} This session: ${project || '?'}`, { weight: 'semibold' })
    if (!view.reasons.length) t('ok', 'On track.')
    view.reasons.forEach((r, i) => t('r' + i, (r.level === 'siren' ? '🚨 ' : '● ') + r.text, { color: COLORS[r.level] }))
    t('since', `Your last message: ${duration(now - s.lastOwnerAt)} ago (${clock(s.lastOwnerAt)})`, { dimColor: true })
    if (s.contextPercent != null) t('ctx', `Context: ${Math.round(s.contextPercent)}%`, { dimColor: true })
    if (s.outside.length) {
      t('oh', 'Outside actions since your last message:', { dimColor: true })
      s.outside.slice(-8).forEach((o, i) => t('o' + i, `  ${clock(o.at)}  ${o.label}${o.asked ? '  (in reply to you)' : '  (on its own)'}`, { dimColor: true }))
    }
    if (s.drift) t('drift', `Drift check ${clock(s.drift.at)}: ${s.drift.onTrack ? 'on track' : 'drifting'}${s.drift.reason ? ' — ' + s.drift.reason : ''}`, { dimColor: true })
    else if (cfg.drift_check) t('drift', 'Drift check: not run yet', { dimColor: true })
    t('sep', ' ')
    if (main.level === 'none') t('m0', 'Main thing: helps is not set up.', { weight: 'semibold' })
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
