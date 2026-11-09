// How this session is doing, as opposed to the person's work as a whole.
//
// The lamp's color comes from facts about this session only:
//   · working without you: how long it has kept going since your last message;
//   · outside actions: servers, pushes, merges, deploys since your last message;
//   · stuck: the same command failing again and again, or one command running for ages;
//   · context: how full the session's context window is;
//   · drifting: a cheap model's check that the work still serves your last request (yellow at most);
//   · an alert line (🚨, URGENT:) in a project's state file: emergency.
// Pure functions; the mod feeds them what it sees.

export const SESSION_DEFAULTS = {
  without_you_yellow_min: 30,
  without_you_red_min: 120,
  outside_yellow: 1,
  outside_red: 3,
  stuck_repeats: 3,
  long_command_min: 10,
  context_yellow: 50,
  context_red: 75,
  drift_check: true,
  drift_every_turns: 3,
  drift_every_min: 10,
}

export function sessionConfig(raw) {
  const out = { ...SESSION_DEFAULTS }
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) {
      if (k in out && typeof v === typeof out[k]) out[k] = v
    }
  }
  return out
}

const LEVELS = ['green', 'yellow', 'red', 'siren']
export const higher = (a, b) => (LEVELS.indexOf(b) > LEVELS.indexOf(a) ? b : a)

// Options of ssh, scp and rsync that take a value, so the value is not taken for the host.
const ARG_OPTS = new Set(['-i', '-o', '-p', '-P', '-F', '-J', '-l', '-e', '-b', '-c', '-D', '-L', '-R', '-W', '-S', '-m', '--rsh'])

function tokens(segment) {
  return segment.match(/"[^"]*"|'[^']*'|\S+/g) || []
}

function hostOf(kind, toks) {
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    if (t.startsWith('-')) { if (ARG_OPTS.has(t)) i++; continue }
    if (kind === 'ssh') return t.replace(/^.*@/, '')
    const m = /^(?:[\w.-]+@)?([\w.-]+):/.exec(t)
    if (m && !/^[A-Za-z]$/.test(m[1])) return m[1]
  }
  return null
}

// What a shell command does outside this machine and this repository, or null.
export function outsideAction(command) {
  const found = []
  for (const segment of String(command || '').split(/&&|\|\||;|\||\n/)) {
    const seg = segment.trim().replace(/^(?:sudo\s+|env\s+(?:\S+=\S*\s+)*|\S+=\S*\s+)+/, '')
    const toks = tokens(seg)
    if (!toks.length) continue
    const cmd = toks[0].replace(/^.*\//, '')
    const rest = toks.slice(1)
    if (cmd === 'ssh') {
      const host = hostOf('ssh', rest)
      if (host && host !== 'localhost' && !/^git@/.test(rest.find((t) => !t.startsWith('-')) || '')) found.push(`ssh ${host}`)
    } else if (cmd === 'scp' || cmd === 'rsync' || cmd === 'sftp') {
      const host = hostOf(cmd, rest)
      if (host) found.push(`${cmd} ${host}`)
    } else if (cmd === 'git') {
      const sub = rest.filter((t, i) => !(t.startsWith('-') || (i > 0 && rest[i - 1] === '-C')))[0]
      if (sub === 'push') found.push('git push')
      else if (sub === 'merge') found.push('git merge')
    } else if (/(^|[-_./])(merge-task|deploy|provision|release|publish|push)([-_./]|$)/i.test(toks[0])) {
      found.push(cmd)
    } else if ((cmd === 'npm' || cmd === 'pnpm' || cmd === 'yarn') && rest[0] === 'publish') {
      found.push(`${cmd} publish`)
    } else if (cmd === 'gh' && rest[0] === 'release' && rest[1] === 'create') {
      found.push('gh release')
    } else if (cmd === 'curl' && /(?:^|\s)(?:-X|--request)\s*(?:POST|PUT|PATCH|DELETE)\b/i.test(seg) &&
               !/\/\/(?:localhost|127\.0\.0\.1)[:/]/.test(seg)) {
      const url = /https?:\/\/([\w.-]+)/.exec(seg)
      found.push(`API write ${url ? url[1] : ''}`.trim())
    } else if (cmd === 'bash' || cmd === 'sh') {
      const script = rest.find((t) => !t.startsWith('-'))
      if (script && /(^|[-_./])(merge-task|deploy|provision|release|publish|push)([-_./]|$)/i.test(script)) found.push(script.replace(/^.*\//, ''))
    }
  }
  return found.length ? [...new Set(found)].join(', ') : null
}

export function duration(ms) {
  const min = Math.max(0, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

const short = (s, n = 60) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

// The state the mod keeps for this session.
export function newSessionState(now) {
  return {
    startedAt: now,
    lastOwnerAt: now, // a reloaded mod has not seen the owner yet: count from the load
    lastActivityAt: now,
    asks: [], // the owner's last messages, newest last
    outside: [], // [{ label, at, asked }] since the owner's last message; asked = done in the turn the owner started
    inOwnerTurn: false, // the main loop is answering the owner right now
    fail: { key: null, count: 0, cmd: '' },
    running: new Map(), // tool_use_id → { cmd, start }
    recent: [], // the session's last commands, for the drift check
    lastAnswer: '',
    contextPercent: null,
    drift: null, // { onTrack, reason, at }
    turnsSinceDrift: 0,
    lastDriftAt: null,
  }
}

export function ownerSpoke(s, text, now) {
  s.lastOwnerAt = now
  s.lastActivityAt = now
  if (text) s.asks = s.asks.concat([String(text).slice(0, 2000)]).slice(-3)
  s.outside = []
  s.inOwnerTurn = true
  s.fail = { key: null, count: 0, cmd: '' }
  s.drift = null
  s.turnsSinceDrift = 0
}

// Reasons and a level for this session, worst first.
export function assess(s, now, cfg, sirens = []) {
  const reasons = []
  const add = (level, kind, text) => reasons.push({ level, kind, text })

  for (const text of sirens) add('siren', 'alert', text)

  const alone = s.lastActivityAt - s.lastOwnerAt
  if (alone >= cfg.without_you_red_min * 60000) add('red', 'alone', `working without you ${duration(alone)}`)
  else if (alone >= cfg.without_you_yellow_min * 60000) add('yellow', 'alone', `working without you ${duration(alone)}`)

  const unasked = s.outside.filter((o) => !o.asked)
  const n = unasked.length
  if (n) {
    const labels = [...new Set(unasked.map((o) => o.label))]
    const text = `${n} outside action${n > 1 ? 's' : ''} without your word: ${short(labels.join(', '), 70)}`
    if (n >= cfg.outside_red) add('red', 'outside', text)
    else if (n >= cfg.outside_yellow) add('yellow', 'outside', text)
  }

  if (s.fail.count >= cfg.stuck_repeats * 2) add('red', 'stuck', `stuck: "${short(s.fail.cmd, 40)}" failed ${s.fail.count}×`)
  else if (s.fail.count >= cfg.stuck_repeats) add('yellow', 'stuck', `stuck: "${short(s.fail.cmd, 40)}" failed ${s.fail.count}×`)
  for (const r of s.running.values()) {
    const took = now - r.start
    if (took >= cfg.long_command_min * 60000) add('yellow', 'stuck', `one command running ${duration(took)}: "${short(r.cmd, 40)}"`)
  }

  if (s.contextPercent != null) {
    if (s.contextPercent >= cfg.context_red) add('red', 'context', `context ${Math.round(s.contextPercent)}% full`)
    else if (s.contextPercent >= cfg.context_yellow) add('yellow', 'context', `context ${Math.round(s.contextPercent)}% full`)
  }

  if (s.drift && s.drift.onTrack === false) add('yellow', 'drift', `drifting from your ask: ${short(s.drift.reason, 80)}`)

  reasons.sort((a, b) => LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level))
  const level = reasons.reduce((lvl, r) => higher(lvl, r.level), 'green')
  return { level, reasons }
}

// The one line the band and the status line show.
export function headline(project, view, s, now) {
  const parts = [project || 'this session']
  if (!view.reasons.length) parts.push('on track')
  else parts.push(...view.reasons.map((r) => r.text))
  if (!view.reasons.some((r) => r.kind === 'alone')) parts.push(`${duration(now - s.lastOwnerAt)} since your message`)
  if (s.contextPercent != null && !view.reasons.some((r) => r.kind === 'context')) parts.push(`context ${Math.round(s.contextPercent)}%`)
  return parts.join(' · ')
}

// The drift check: what a cheap model is asked, and how its answer is read.
export const DRIFT_SYSTEM = 'You check whether an AI coding session is still working towards what its owner asked for. ' +
  'Judge only the direction of the work, not its quality or style. Ignore the language the texts are written in. ' +
  'Answer with JSON only: {"on_track": true or false, "reason": "<one short sentence, at most 15 words>"}. ' +
  'If you are not sure, answer on_track true.'

export function driftPrompt(s) {
  const asks = s.asks.map((a, i) => `${i + 1}. ${a}`).join('\n')
  return `The owner's last messages to the session, oldest first:\n<<<\n${asks}\n>>>\n\n` +
    `The session's latest reply:\n<<<\n${String(s.lastAnswer || '').slice(-1500)}\n>>>\n\n` +
    `The session's recent commands:\n${s.recent.map((c) => '- ' + short(c, 120)).join('\n') || '- none'}\n\n` +
    'Is the session still working towards what the owner asked for?'
}

export function readDrift(text) {
  const m = /\{[\s\S]*\}/.exec(String(text || ''))
  if (!m) return null
  try {
    const v = JSON.parse(m[0])
    if (typeof v.on_track !== 'boolean') return null
    return { onTrack: v.on_track, reason: String(v.reason || '').slice(0, 160) }
  } catch { return null }
}
