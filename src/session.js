// How this session is doing, as opposed to the person's work as a whole.
//
// The lamp's color comes from facts about this session only:
//   · working without you: how long it has kept going in turns it started itself
//     (a background task reporting back, a schedule, another session) since your last message;
//   · outside actions on its own: servers, pushes, merges, deploys in such turns;
//   · stuck: the same command failing again and again, or one command running for ages;
//   · context: how full the session's context window is;
//   · drifting: a cheap model's check that the work still serves your last request (yellow at most);
//   · an alert line (🚨, URGENT:) in a project's state file: emergency.
// "Pause" is the one thing that acts: after the person presses it, tool calls are refused until they speak.
// Pure functions; the mod feeds them what it sees.

export const SESSION_DEFAULTS = {
  without_you_yellow_min: 30,
  without_you_red_min: 120,
  outside_yellow: 1,
  outside_red: 3,
  stuck_repeats: 3,
  long_command_min: 5,
  context_yellow: 50,
  context_red: 75,
  drift_check: true,
  drift_every_turns: 3,
  drift_every_min: 10,
  update_check: true,
}

// "0.6.1" is newer than "0.6.0"; anything unparsable is not newer.
export function isNewer(candidate, current) {
  const parse = (v) => (/^\d+(\.\d+)*$/.test(String(v || '')) ? String(v).split('.').map(Number) : null)
  const a = parse(candidate)
  const b = parse(current)
  if (!a || !b) return false
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0)
  }
  return false
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

// How the band above the prompt looks: config.json "band". A value that is not listed falls back to the default.
//   size:   small | smallest | normal   (the terminal has one text size and ignores it)
//   layout: lamp (the lamp, a short line and Details; the other buttons are in Details)
//           line (everything in one row) | full (the line, and the buttons on a row of their own)
export const BAND_DEFAULTS = { size: 'small', layout: 'lamp' }
const BAND_VALUES = { size: ['small', 'smallest', 'normal'], layout: ['lamp', 'line', 'full'] }
export const TEXT_SIZE = { small: 'footnote', smallest: 'caption', normal: undefined }

export function bandConfig(raw) {
  const out = { ...BAND_DEFAULTS }
  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(BAND_VALUES)) if (BAND_VALUES[k].includes(raw[k])) out[k] = raw[k]
  }
  return out
}

const LEVELS = ['green', 'yellow', 'red', 'siren']
export const higher = (a, b) => (LEVELS.indexOf(b) > LEVELS.indexOf(a) ? b : a)

// ---------------------------------------------------------------- shell parsing

// Heredoc bodies are data, not commands: `git commit -m "$(cat <<'EOF' … EOF)"`.
function dropHeredocs(command) {
  return command.replace(/<<-?\s*(['"]?)([A-Za-z_]\w*)\1([^\n]*)\n[\s\S]*?\n[ \t]*\2[ \t]*(?=\n|$)/g, '<<$1$2$1$3')
}

// Split into simple commands on ; && || | & and newlines, outside quotes and $( … ).
export function splitCommands(command) {
  const text = dropHeredocs(String(command || ''))
  const out = []
  let cur = ''
  let quote = null
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quote) {
      cur += c
      if (c === '\\' && quote === '"' && i + 1 < text.length) { cur += text[++i]; continue }
      if (c === quote) quote = null
      continue
    }
    if (c === '\\' && i + 1 < text.length) { cur += c + text[++i]; continue }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue }
    if (c === '$' && text[i + 1] === '(') { depth++; cur += '$('; i++; continue }
    if (c === ')' && depth > 0) { depth--; cur += c; continue }
    if (depth === 0 && (c === ';' || c === '\n' || c === '&' || c === '|')) {
      if ((c === '&' || c === '|') && text[i + 1] === c) i++
      out.push(cur)
      cur = ''
      continue
    }
    cur += c
  }
  out.push(cur)
  return out.map((x) => x.trim().replace(/^[({!\s]+|[)}\s]+$/g, '').trim()).filter(Boolean)
}

// Words of one simple command, quotes removed.
export function words(segment) {
  const out = []
  let cur = ''
  let quote = null
  let has = false
  for (let i = 0; i < segment.length; i++) {
    const c = segment[i]
    if (quote) {
      if (c === quote) { quote = null; continue }
      if (c === '\\' && quote === '"' && i + 1 < segment.length) { cur += segment[++i]; continue }
      cur += c
      continue
    }
    if (c === "'" || c === '"') { quote = c; has = true; continue }
    if (c === '\\' && i + 1 < segment.length) { cur += segment[++i]; has = true; continue }
    if (/\s/.test(c)) { if (has || cur) out.push(cur); cur = ''; has = false; continue }
    cur += c
    has = true
  }
  if (has || cur) out.push(cur)
  return out
}

const KEYWORDS = new Set(['if', 'then', 'else', 'elif', 'do', 'while', 'until', 'time', '!'])
const WRAPPERS = { sudo: ['-u', '-g', '-h', '-p', '-C', '-D', '-U'], doas: ['-u'], env: ['-u', '-C', '-S'], nohup: [],
  timeout: ['-s', '-k', '--signal', '--kill-after'], nice: ['-n'], ionice: ['-c', '-n'], stdbuf: [], command: [], exec: [],
  xargs: ['-I', '-n', '-P', '-L', '-d', '-E', '-s', '-a'], watch: ['-n'], caffeinate: [] }

// The command words with prefixes like VAR=x, sudo, env, timeout 30, nohup removed.
function core(ws) {
  let i = 0
  for (;;) {
    if (i >= ws.length) return []
    const w = ws[i]
    if (KEYWORDS.has(w) || /^[A-Za-z_]\w*=/.test(w)) { i++; continue }
    const name = w.replace(/^.*\//, '')
    if (name in WRAPPERS) {
      i++
      while (i < ws.length && ws[i].startsWith('-')) { if (WRAPPERS[name].includes(ws[i])) i++; i++ }
      if (name === 'timeout' && i < ws.length && /^\d/.test(ws[i])) i++
      continue
    }
    return ws.slice(i)
  }
}

// Options of ssh, scp, rsync and sftp that take a value, so the value is not taken for the host.
const ARG_OPTS = new Set(['-i', '-o', '-p', '-P', '-F', '-J', '-l', '-e', '-b', '-c', '-D', '-L', '-R', '-W', '-S', '-m', '--rsh'])

function remote(kind, args) {
  for (let i = 0; i < args.length; i++) {
    const t = args[i]
    if (t.startsWith('-')) { if (ARG_OPTS.has(t)) i++; continue }
    if (kind === 'ssh' || kind === 'sftp') {
      const user = t.includes('@') ? t.split('@')[0] : ''
      const host = t.replace(/^.*@/, '').replace(/:.*$/, '')
      if (user === 'git' || ['localhost', '127.0.0.1', '::1'].includes(host)) return null
      return host
    }
    const m = /^(?:[\w.-]+@)?([\w.-]+):/.exec(t)
    if (m && !/^[A-Za-z]$/.test(m[1])) return m[1]
  }
  return null
}

const SCRIPT = /(^|[-_.])(merge-task|deploy|provision|release|publish|push)([-_.]|$)/i
const LOCAL = /\/\/(?:localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(?::\d+)?(?:\/|$)/
const base = (p) => String(p || '').replace(/^.*\//, '')
// The host of a URL, without any user:password@ in front of it.
const hostOf = (url) => String(url).replace(/^https?:\/\/(?:[^/@]*@)?([^/:?#]+).*$/, '$1').slice(0, 60)

function classify(ws, found, depth) {
  const w = core(ws)
  if (!w.length) return
  const cmd = base(w[0])
  const a = w.slice(1)
  const first = a.find((t) => !t.startsWith('-'))
  if (cmd === 'ssh' || cmd === 'scp' || cmd === 'rsync' || cmd === 'sftp') {
    const host = remote(cmd, a)
    if (host) found.add(`${cmd} ${host}`)
  } else if (cmd === 'git') {
    let i = 0
    while (i < a.length && a[i].startsWith('-')) { if (['-C', '-c', '--git-dir', '--work-tree', '--namespace'].includes(a[i])) i++; i++ }
    const sub = a[i]
    const rest = a.slice(i + 1)
    if (sub === 'push' && !rest.some((t) => t === '--dry-run' || t === '-n')) found.add('git push')
    else if (sub === 'merge' && !rest.some((t) => ['--abort', '--quit', '--continue'].includes(t))) found.add('git merge')
  } else if (cmd === 'gh') {
    if (a[0] === 'pr' && a[1] === 'merge') found.add('gh pr merge')
    else if (a[0] === 'release' && a[1] === 'create') found.add('gh release')
    else if (a[0] === 'api' && a.some((t, i) => (t === '-X' || t === '--method') && /^(POST|PUT|PATCH|DELETE)$/i.test(a[i + 1] || ''))) found.add('gh api write')
  } else if (cmd === 'docker' || cmd === 'podman') {
    if (first === 'push' || (first === 'compose' && a.includes('push'))) found.add(`${cmd} push`)
  } else if (cmd === 'kubectl' || cmd === 'oc') {
    if (['apply', 'delete', 'patch', 'replace', 'scale', 'rollout', 'set', 'create'].includes(first)) found.add(`kubectl ${first}`)
  } else if (cmd === 'helm') {
    if (['install', 'upgrade', 'uninstall', 'rollback'].includes(first)) found.add(`helm ${first}`)
  } else if (cmd === 'terraform' || cmd === 'tofu') {
    if (first === 'apply' || first === 'destroy') found.add(`${cmd} ${first}`)
  } else if (['wrangler', 'netlify', 'flyctl', 'fly', 'firebase', 'vercel', 'surge'].includes(cmd)) {
    if (cmd === 'vercel' ? (first === undefined || first === 'deploy' || a.includes('--prod')) : ['deploy', 'publish'].includes(first)) found.add(`${cmd} deploy`)
  } else if (cmd === 'npm' || cmd === 'pnpm' || cmd === 'yarn' || cmd === 'bun') {
    if (first === 'publish') found.add(`${cmd} publish`)
    else {
      const script = first === 'run' || first === 'run-script' ? a[a.indexOf(first) + 1] : cmd === 'npm' ? null : first
      if (script && SCRIPT.test(script)) found.add(`${cmd} run ${script}`)
    }
  } else if (cmd === 'npx' || cmd === 'bunx' || cmd === 'pnpx') {
    if (depth < 3) classify(a.filter((t, i) => !(t.startsWith('-') && i === 0)), found, depth + 1)
  } else if (cmd === 'make') {
    const target = a.find((t) => !t.startsWith('-') && !t.includes('='))
    if (target && SCRIPT.test(target)) found.add(`make ${target}`)
  } else if (cmd === 'curl') {
    const method = a.find((t, i) => (a[i - 1] === '-X' || a[i - 1] === '--request')) || ''
    const writes = /^(POST|PUT|PATCH|DELETE)$/i.test(method) ||
      a.some((t) => /^(-d|--data|--data-\w+|-F|--form|-T|--upload-file|--json)$/.test(t) || /^--data(-\w+)?=/.test(t))
    const url = a.find((t) => /^https?:\/\//.test(t))
    if (writes && url && !LOCAL.test(url)) found.add(`API write ${hostOf(url)}`)
  } else if (cmd === 'wget') {
    const url = a.find((t) => /^https?:\/\//.test(t))
    if (url && !LOCAL.test(url) && a.some((t) => /^--(post-data|post-file|method=(POST|PUT|PATCH|DELETE))/i.test(t))) found.add(`API write ${hostOf(url)}`)
  } else if (['bash', 'sh', 'zsh', 'dash'].includes(cmd) && a.includes('-c') && depth < 3) {
    const inner = a[a.indexOf('-c') + 1]
    if (inner) for (const seg of splitCommands(inner)) classify(words(seg), found, depth + 1)
  } else if (['bash', 'sh', 'zsh', 'node', 'python', 'python3', 'php', 'ruby', 'perl', 'deno', 'bun', 'tsx'].includes(cmd)) {
    const script = a.find((t) => !t.startsWith('-') && t !== 'run')
    if (script && SCRIPT.test(base(script))) found.add(base(script))
  } else if (SCRIPT.test(cmd)) {
    found.add(cmd)
  }
}

// What a shell command does outside this machine and this repository, or null.
export function outsideAction(command) {
  const found = new Set()
  // The first 10,000 characters decide: a command longer than that is a script pasted inline.
  for (const seg of splitCommands(String(command || '').slice(0, 10000))) classify(words(seg), found, 0)
  return found.size ? [...found].join(', ') : null
}

// Tools of connected services that change something there: a message sent, a page created, a pull request merged.
const WRITE_VERB = /(^|[-_.])(send|post|reply|forward|create|update|edit|delete|remove|trash|archive|merge|publish|deploy|push|upload|write|move|share|schedule|fire|apply|run|execute|invite|comment)([-_.]|$)/i

export function outsideTool(tool, isReadOnly) {
  const m = /^mcp__(.+?)__(.+)$/.exec(String(tool || ''))
  if (!m || m[1] === 'helps' || isReadOnly === true) return null
  return WRITE_VERB.test(m[2]) ? `${m[1]}: ${m[2]}`.slice(0, 60) : null
}

// Command lines are shown in the band and sent to the drift check: keep secrets out of both.
export function redact(text) {
  return String(text ?? '')
    .replace(/(authorization\s*[:=]\s*(?:bearer|basic|token)?\s*)[^\s"']+/gi, '$1***')
    .replace(/((?:token|secret|password|passwd|pwd|api[-_]?key|access[-_]?key|private[-_]?key)\w*\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s"'&]+)/gi, '$1***')
    .replace(/(:\/\/[^/\s:@]+:)[^@\s/]+@/g, '$1***@')
    .replace(/(:\/\/)[^/\s:@]{8,}@/g, '$1***@')
    .replace(/(\s-u\s+[^\s:]+:)\S+/g, '$1***')
    .replace(/\b(?:sk|pk|rk|ghp|gho|ghu|ghs|ghr|github_pat|glpat|xox[abprs])[-_][A-Za-z0-9_-]{12,}/g, '***')
    .replace(/\b[A-Za-z0-9+_-]{40,}={0,2}/g, '***')
}

export function duration(ms) {
  const min = Math.max(0, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

const short = (s, n = 60) => {
  const t = String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

// The state the mod keeps for this session.
export function newSessionState(now) {
  return {
    startedAt: now,
    lastOwnerAt: now, // a reloaded mod has not seen the owner yet: count from the load
    lastActivityAt: now,
    autoSince: null, // when the first turn the session started itself began, since the owner last spoke
    awaitingUntil: null, // the owner spoke while idle: a main-loop turn starting before this answers them
    ownerAgents: new Set(), // subagents first seen while the session was answering the owner
    seenAgents: new Set(),
    asks: [], // the owner's last messages, newest last
    outside: [], // [{ label, at, asked }] since the owner's last message; asked = done in the turn the owner started
    inOwnerTurn: false, // the main loop is answering the owner right now
    gen: 0, // bumped when the owner speaks, so a late drift verdict about older work is dropped
    fail: { key: null, count: 0, cmd: '' },
    running: new Map(), // tool_use_id → { cmd, start }: shell commands not finished yet
    answerCredits: 0, // questions the person answered with buttons and whose answers are not written yet
    answerCreditsAt: 0,
    paused: false, // the person pressed Pause: tool calls are refused until they speak
    recent: [], // the session's last commands, for the drift check
    lastAnswer: '',
    contextPercent: null,
    drift: null, // { onTrack, reason, at }
    turnsSinceDrift: 0,
    lastDriftAt: null,
  }
}

// Prompt origins that are the person at the keyboard (or phone), not a notification, a peer, a schedule or a plugin.
const OWNER_ORIGINS = new Set(['composer', 'bridge', 'sdk', 'slack-ping', 'auto-continuation'])

// Who a submitted prompt is from, as far as the lamp cares:
//   'owner'   the person typed a request;
//   'command' the person ran a slash command (present, but it says nothing about the work);
//   'button'  the person pressed one of helps' own buttons;
//   'other'   a notification, another session, a schedule, a channel, another plugin.
export function promptFrom(e) {
  const o = e.origin
  if (o && o.kind === 'plugin') return o.name === 'helps' && o.asUser ? 'button' : 'other'
  const person = o && typeof o.kind === 'string' ? OWNER_ORIGINS.has(o.kind) : !e.isMeta
  if (!person) return 'other'
  return e.command ? 'command' : 'owner'
}

// The person is here (a button, a command) but gave no new request: the clock starts over, the lists stay.
export function ownerPresent(s, now) {
  s.lastOwnerAt = now
  s.lastActivityAt = now
  s.autoSince = null
}

export function ownerSpoke(s, text, now) {
  s.lastOwnerAt = now
  s.lastActivityAt = now
  s.autoSince = null
  s.paused = false
  if (text) s.asks = s.asks.concat([String(text).slice(0, 2000)]).slice(-3)
  s.outside = []
  s.gen = (s.gen || 0) + 1
  s.fail = { key: null, count: 0, cmd: '' }
  s.drift = null
  s.turnsSinceDrift = 0
}

// Reasons and a level for this session, worst first.
export function assess(s, now, cfg, sirens = []) {
  const reasons = []
  const add = (level, kind, text) => reasons.push({ level, kind, text })

  for (const text of sirens) add('siren', 'alert', text)

  // Time in turns the session started itself; a long turn the owner asked for is not "without you".
  const alone = s.autoSince != null ? Math.max(0, s.lastActivityAt - s.autoSince) : 0
  if (alone >= cfg.without_you_red_min * 60000) add('red', 'alone', `working without you ${duration(alone)}`)
  else if (alone >= cfg.without_you_yellow_min * 60000) add('yellow', 'alone', `working without you ${duration(alone)}`)

  const unasked = s.outside.filter((o) => !o.asked)
  const n = unasked.length
  if (n) {
    const labels = [...new Set(unasked.map((o) => o.label))]
    const text = `${n} outside action${n > 1 ? 's' : ''} on its own: ${short(labels.join(', '), 70)}`
    if (n >= cfg.outside_red) add('red', 'outside', text)
    else if (n >= cfg.outside_yellow) add('yellow', 'outside', text)
  }

  if (s.fail.count >= cfg.stuck_repeats * 2) add('red', 'stuck', `stuck: "${short(redact(s.fail.cmd), 40)}" failed ${s.fail.count}×`)
  else if (s.fail.count >= cfg.stuck_repeats) add('yellow', 'stuck', `stuck: "${short(redact(s.fail.cmd), 40)}" failed ${s.fail.count}×`)
  for (const r of s.running.values()) {
    const took = now - r.start
    // Still running, or still waiting for the person's permission: either way it wants a look.
    if (took >= cfg.long_command_min * 60000) add('yellow', 'stuck', `one command pending ${duration(took)}: "${short(redact(r.cmd), 40)}"`)
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
// `brief` is the short line of the "lamp" layout: the top reason only, the rest is in Details.
export function headline(project, view, s, now, brief = false) {
  const parts = [project || 'this session']
  const shown = brief ? 1 : 2
  if (s.paused) parts.push(brief ? 'paused by you' : 'paused by you: write to it to go on')
  if (!view.reasons.length) { if (!s.paused) parts.push('on track') }
  else {
    parts.push(...view.reasons.slice(0, shown).map((r) => r.text))
    if (view.reasons.length > shown) parts.push(`+${view.reasons.length - shown} more`)
  }
  if (!view.reasons.some((r) => r.kind === 'alone')) parts.push(brief ? `you ${duration(now - s.lastOwnerAt)} ago` : `${duration(now - s.lastOwnerAt)} since your message`)
  if (!brief && s.contextPercent != null && !view.reasons.some((r) => r.kind === 'context')) parts.push(`context ${Math.round(s.contextPercent)}%`)
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
    `The session's recent commands:\n${s.recent.map((c) => '- ' + short(redact(c), 120)).join('\n') || '- none'}\n\n` +
    'Is the session still working towards what the owner asked for?'
}

export function readDrift(text) {
  const m = /\{[\s\S]*\}/.exec(String(text || ''))
  if (!m) return null
  try {
    const v = JSON.parse(m[0])
    if (typeof v.on_track !== 'boolean') return null
    return { onTrack: v.on_track, reason: String(v.reason || '').replace(/\s+/g, ' ').replace(/["`]/g, "'").trim().slice(0, 160) }
  } catch { return null }
}

// What the helps tool may do without asking the person. Reading, and writing the assistant's own data
// folder (one-line values, checked and capped), always. Writing an answer into a project's state file
// only when the person has just answered a question with buttons: nobody else may sign for them.
export function helpsToolNeedsPerson(args, s, now) {
  if (!Array.isArray(args) || args[0] !== 'answer') return false
  const fresh = s && s.answerCredits > 0 && now - s.answerCreditsAt <= 30 * 60000
  return !fresh
}
