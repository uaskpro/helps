// helps as a Claude Code mod: everything runs inside Claude Code, nothing to install.
// · core.js, the same core the Codex and Gemini wrappers run through Node;
// · the mcp__helps__run tool: the assistant's commands for Claude (args as on the command line);
// · the main thing as a section of the system prompt;
// · the lamp: every 30 seconds it works out the state and shows it above the prompt (terminal
//   and desktop) and in the status line (every surface, the mobile app included):
//   🟢 on track · 🟡 starting to drift · 🔴 going the wrong way · 🚨 emergency (blinks).
// Buttons send a request on the person's behalf; the "Details" pane lists every reason.

import { run, health as coreHealth, contextText, makeCtx, COMMAND_NAMES } from './core.js'

const PANE = 'helps-lamp'
const POLL_MS = 30_000
const BLINK_MS = 500
const COLORS = { none: 'gray', green: 'green', yellow: 'yellow', red: 'red', siren: 'red' }
const RANK = { none: 0, green: 1, yellow: 2, red: 3, siren: 4 }

let health = { level: 'none', lamp: '⚪', headline: 'checking…', reasons: [] }
let blinkOn = true
let lastLevel = null
let errorText = null
let contextSection = null

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
  }
}

function statusLine() {
  if (errorText) return '⚪ helps: could not check — ' + errorText
  if (health.level === 'none') return '⚪ helps is not set up — say "set up helps"'
  const head = health.level === 'siren' ? '🚨 EMERGENCY · ' : health.lamp + ' '
  return head + (health.project ? 'Main thing: ' + health.project + ' · ' : '') + health.headline
}

async function refresh($) {
  try {
    const next = await coreHealth(await makeCtx(makeIo($)))
    errorText = null
    if (lastLevel !== null && RANK[next.level] > RANK[lastLevel]) {
      $.ui.toast(next.lamp + ' ' + next.headline)
    }
    lastLevel = next.level
    health = next
  } catch (err) {
    errorText = String((err && err.message) || err).slice(0, 200)
  }
  $.ui.status(statusLine())
  $.ui.invalidate('ui.render')
}

async function ask($, text) {
  try {
    await $.prompt.submit({ text, asUser: true })
  } catch (err) {
    $.ui.toast('helps: ' + String((err && err.message) || err).slice(0, 120))
  }
}

const hasKind = (kind) => (health.reasons || []).some((r) => r.kind === kind)

export function register(on) {
  on('session.start', async ($, e, next) => {
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
      if (health.level === 'siren') {
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

  on('prompt.compose', async ($, e, next) => {
    const res = await next(e)
    if (!contextSection) return res
    return { sections: [...res.sections, { id: 'helps:focus', text: contextSection, scope: 'session' }] }
  })

  on('tool.call', { tool: 'mcp__helps__run' }, async ($, e) => {
    const args = Array.isArray(e.args) ? e.args : []
    const r = await run(makeIo($), args)
    if (args[0] === 'doctor' && r.code === 0) {
      // Where this session draws: the lamp band shows on terminal and desktop only.
      const surfaces = await $.session.surfaces()
      const panes = await $.ui.panes()
      r.out += `\nsurfaces: ${surfaces.length ? surfaces.join(', ') : 'none'}` +
        `\nlamp: level ${health.level}, ${errorText ? 'error ' + errorText : 'ok'}` +
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
    const color = COLORS[health.level] || 'gray'
    const siren = health.level === 'siren'
    const lamp = Text({
      color: siren && !blinkOn ? undefined : color,
      dimColor: siren && !blinkOn ? true : undefined,
      inverse: siren && blinkOn ? true : undefined,
      weight: 'semibold',
      children: [siren ? ' 🚨 EMERGENCY ' : '● '],
    })
    const words = errorText
      ? 'helps: could not check — ' + errorText
      : health.level === 'none'
        ? 'helps is not set up'
        : (health.project ? 'Main thing: ' + health.project + ' · ' : '') + health.headline
    const buttons = []
    if (health.level === 'none') {
      buttons.push(Button({ key: 'helps-setup', label: 'Set up', plain: true,
        onPress: () => ask($, 'Set up the helps assistant with me.') }))
    } else {
      if (health.level !== 'green') {
        buttons.push(Button({ key: 'helps-back', label: 'Back to the main thing', plain: true,
          onPress: () => ask($, 'Let\'s get back to the main thing. What is it now and where did we stop?') }))
      }
      if (hasKind('decisions')) {
        buttons.push(Button({ key: 'helps-decide', label: 'Go through decisions', plain: true,
          onPress: () => ask($, 'Let\'s go through the decisions waiting for me, one by one.') }))
      }
      if ((health.reasons || []).length > 0) {
        buttons.push(Button({ key: 'helps-more', label: 'Details', plain: true,
          onPress: async () => {
            await $.ui.open({ id: PANE, title: 'helps', focus: true, closeOnEscape: true })
          } }))
      }
    }
    const ours = Box({
      flexDirection: 'row',
      columnGap: 2,
      children: [
        Box({ flexDirection: 'row', children: [lamp, Text({ color: siren ? 'red' : undefined, children: [words] })] }),
        ...buttons,
      ],
    })
    if (!theirs) return ours
    return Box({ flexDirection: 'column', children: [ours, theirs] })
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const rows = (health.reasons || []).map((r, i) =>
      Text({ key: 'r' + i, color: COLORS[r.level], children: [(r.level === 'siren' ? '🚨 ' : '● ') + r.text] }))
    return Box({
      flexDirection: 'column',
      rowGap: 1,
      children: [
        Text({ weight: 'semibold', children: [health.lamp + ' ' + (health.project ? 'Main thing: ' + health.project : 'helps')] }),
        health.finish ? Text({ dimColor: true, children: ['Done when: ' + health.finish] }) : Text({ children: [''] }),
        ...(rows.length ? rows : [Text({ children: ['All on track.'] })]),
        Text({ dimColor: true, children: ['🟢 on track · 🟡 drifting · 🔴 wrong way · 🚨 emergency · Esc to close'] }),
      ],
    })
  })
}
