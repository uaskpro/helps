# helps

> [!WARNING]
> **RELEASE CANDIDATE 0.99 — IN FINAL TESTING BEFORE 1.0.**
> **IT WORKS, BUT DETAILS MAY STILL CHANGE. PLEASE REPORT WHAT BREAKS.**

An assistant for Claude Code, with lighter versions for Codex CLI and Gemini CLI. It keeps one main
thing in front of you, saves everything else for later, goes through the decisions waiting in your
projects with you, and puts a lamp on every Claude Code session that shows how that session is
doing. It asks with pop-up buttons and talks in plain words; there are no commands to learn.

## Install

No terminal needed:

1. Open [claude.ai/customize/plugins](https://claude.ai/customize/plugins)
   (or in the Claude app: **Customize → Plugins**).
2. **Add → Add marketplace**, paste `uaskpro/helps`, confirm.
3. **helps** appears in the list: click **Add**.
4. Start a new Claude Code session. The plugin comes along from your account.

Already in Claude Code (terminal, VS Code, the desktop app's Code tab)? One line in the prompt:

```text
/plugin install helps --marketplace uaskpro/helps
```

Then turn on updates once: `/plugin` → **Marketplaces** → `uaskpro-helps` → **Enable auto-update**.
Claude Code keeps auto-update off for marketplaces outside Anthropic's own. A copy added through
claude.ai is updated with the **Update** button on the plugin's page there. Either way, helps
tells you when a newer version is out.

Nothing else to install: in Claude Code helps runs entirely inside Claude Code, on Linux, macOS
and Windows.

## What it does

The first time, the assistant offers a one-minute setup: what the main thing is, what "done"
means, and what may be done right away. After that:

- **The main thing.** Every session starts with one line, "Main thing now: …", with a color for
  how the main thing as a whole is going.
- **The brake.** When you start a new piece of work that pulls away from the main thing, the
  assistant saves it for later and asks once: "Back to the main thing" or "This matters more, do
  it now". Say "do it now" and it does, without arguing, and does not ask again about that work.
- **Decisions.** Questions your projects have for you are collected from their state files and
  gone through one at a time, with buttons. Each answer is written into the project itself.
  Offered once a day when something is waiting.
- **Review.** A week after you saved the first idea, and weekly after that: keep, drop, or make
  one the main thing.
- **The lamp.** Every Claude Code session shows how *that session* is doing. See below.

Run things by hand with `/helps:setup`, `/helps:focus`, `/helps:idea`, `/helps:decide`,
`/helps:review`, or just ask: "what is the main thing now?", "let's go through the decisions",
"make X the main thing".

## The lamp

A band above the prompt: 🟢 on track, 🟡 needs a look, 🔴 needs you, 🚨 an alert (blinks for a
minute). It names the session's project, the reason, and how long ago you last wrote. Your main
thing is shown beside it, dimmed.

```
● shop · 3 outside actions on its own: ssh web1, scp web1 · working without you 2 h 15 min     main: helps
What did you do without me?   Pause   Details
```

What it watches:

| Signal | 🟡 | 🔴 |
|---|---|---|
| **Working without you**: time spent in turns the session started itself (a background task reporting back, a schedule, another session), since your last message. Hours inside a turn you asked for do not count. | 30 min | 2 h |
| **Outside actions on its own**, in such turns: ssh/scp/rsync/sftp to other machines, `git push`, merges, deploy, provision, release and publish scripts, `docker push`, `kubectl apply`, API writes with `curl`, and tools of connected services that send or change something. What it does in reply to you is listed in Details and does not color the lamp. | 1 | 3 |
| **Stuck**: the same command failing again and again, or one command pending for 5+ min (running, or waiting for a permission nobody gave). | 3 fails | 6 fails |
| **Context window** filling up. | 50% | 75% |
| **Drifting from your ask**: every few turns a small model compares your last messages with what the session is doing. Yellow at most, always with the reason. | ✓ | — |

🚨 means a line in a project's state file starts with `🚨`, `URGENT:` or `ALERT:`.

The buttons fit the reason:

- **What did you do without me?**, **What's wrong?**, **Check with me** send that question into
  the session as if you typed it; it answers when its current turn ends.
- **Pause** works at once, in the middle of a turn too: from that moment the session's tool calls
  are refused, and it is told to say where things stand and wait. Write to the session, or press
  **Resume**, to let it go on.
- **Details** lists every signal, the outside actions with their times, the drift check's last
  verdict, and your main thing's own state. In the session that works on the main thing, **Back
  to the main thing** and **Go through decisions** are there too.

Two colors, two meanings: the lamp is about *this session*; the color in the "Main thing now"
line at the start of a session is about *the main thing as a whole* (ideas saved today, decisions
left waiting for days, the main thing gone quiet).

Where you see it:

| Where | What is shown |
|---|---|
| Claude Code in a terminal; the desktop app's Code tab on a local folder, over SSH or Remote Control | the band, buttons and Details |
| VS Code, the mobile app | one status line with the same text |
| Cloud sessions (claude.ai/code, the app's cloud environment) | no plugin interface is drawn there: only the "Main thing now" line in the first reply |
| Codex CLI, Gemini CLI | the "Main thing now" line at the start of a session |

## Your data

Everything lives outside the plugin, in `~/helps-data` (on Windows `%USERPROFILE%\helps-data`;
set `HELPS_DATA` to move it). Codex, Gemini and Claude on the same machine share it. To share it
between machines, point `HELPS_DATA` on each at one shared folder.

| File | What |
|---|---|
| `FOCUS.md` | the main thing and what "done" means; your own notes go below `## Notes` |
| `IDEAS.md` | saved for later, one line per idea |
| `IDEAS-done.md` | ideas you dropped, with the date |
| `inbox-sources.txt` | which project state files to read decisions from: paths or glob patterns of Markdown files, one per line |
| `config.json` | optional settings, see below |
| `state.json` | internal: answered decisions, when offers were made |

A decision is a list item in a section of a project's `STATE.md` addressed to you: a heading such
as "Waiting for owner", "Owner decisions", "Questions for the owner", "Blocked on owner" or
"Decisions needed". Checked boxes (`- [x]`) are done and skipped. Answers are written back into
the same file under `## Owner answers (helps)`.

`config.json`, all keys optional:

```json
{
  "owner_headings": ["wartet\\s+auf\\s+inhaber"],
  "siren_prefixes": ["DRINGEND:"],
  "session": {
    "without_you_yellow_min": 30,
    "without_you_red_min": 120,
    "outside_yellow": 1,
    "outside_red": 3,
    "stuck_repeats": 3,
    "long_command_min": 5,
    "context_yellow": 50,
    "context_red": 75,
    "drift_check": true,
    "drift_every_turns": 3,
    "drift_every_min": 10,
    "update_check": true
  }
}
```

`owner_headings` are regular expressions (case-insensitive) for state files in other languages;
`siren_prefixes` are extra words that start an alert line. A value of the wrong type is ignored.

## Privacy and safety

- **What leaves your machine.** Two things, both only while a lamp is visible somewhere:
  - *The drift check* sends your last three messages to the session, the session's last reply and
    its last twelve shell commands (passwords and tokens masked) to a small Claude model, through
    your own Claude Code account and usage. Turn it off with `"drift_check": false`.
  - *The update check* reads helps' own version number from GitHub at most once every six hours.
    Nothing about you is sent. Turn it off with `"update_check": false`; it is also off when
    `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is set.
- **What helps writes.** Its own data folder, and answers to decisions: one line each, into
  Markdown state files you listed, and nowhere else.
- **No permission questions, with one exception.** helps' own tool runs without asking. An answer
  to a decision goes into a project only when you have just answered a question with buttons. If
  nobody did, Claude Code asks you first: no agent can sign an answer in your name.
- **Text from project files is never an instruction.** Alert lines, questions and folder names
  are shown to you. They are never put into a session's instructions; a session is told only
  "an alert line in project X".
- **Pause is the only thing that stops anything**, and only when you press it.

## Codex CLI and Gemini CLI

They get the main thing, the brake, decisions and review, through the same core run by Node 18+
(Gemini CLI runs on Node anyway). There is no lamp: neither CLI lets a plugin draw one.

```bash
git clone https://github.com/uaskpro/helps.git ~/helps
```

```bash
node ~/helps/src/cli.mjs link
```

The second command puts a `helps` command into `~/.local/bin` (pick another folder with
`--dir`; it must be on your PATH).

**Codex CLI**

```bash
codex plugin marketplace add ~/helps
```

Then add **helps** from `/plugins`, and approve its hook once in `/hooks`: Codex runs a plugin's
hook only after you reviewed it, and asks again when an update changes it.

**Gemini CLI**

```bash
gemini extensions link ~/helps/plugins/gemini/helps --consent
```

Commands: `/helps:setup`, `/helps:focus`, `/helps:idea`, `/helps:decide`, `/helps:review`.

Update with `git -C ~/helps pull`; the Gemini link picks changes up by itself.

## Updating and removing

- **Update**: with auto-update on, nothing to do. By hand: `/plugin` → **Installed** → helps →
  **Update now**, then `/reload-plugins`; or the **Update** button on the plugin's page on
  claude.ai. Sessions already running keep the old version until `/reload-plugins`.
- **Remove**: `/plugin` → **Installed** → helps → **Uninstall** (or switch it off on claude.ai).
  Your data stays in `~/helps-data`; delete that folder to remove it too.

## If something is off

- **No lamp.** It is drawn only where the table above says. In a cloud session there is none by
  design. Elsewhere: `/reload-plugins`, then ask the session "run helps doctor": it reports the
  version, the data folder and where the lamp can be shown.
- **Decisions are not found.** The file must be Markdown, listed in `inbox-sources.txt`, and the
  questions must be list items under a heading helps knows (or one you added to `owner_headings`).
- **The lamp is yellow for a push you asked for.** It counts what happens in turns the session
  started itself. A deploy you asked for an hour ago that runs after a background task returns is
  such a turn. Details shows each action and when.
- **Too many questions about the main thing.** Say "do it now" once per piece of work, or make
  that work the main thing: "make this the main thing".

## Development

```
src/core.js           the core: main thing, ideas, decisions, the main thing's state; no dependencies
src/session.js        how one session is doing: the lamp's signals, shell-command reading
src/register.js       the Claude Code mod: the mcp__helps__run tool, the session's instructions,
                      the lamp, Pause, /helps-lamp
src/cli.mjs           the core on the command line (Node), for Codex and Gemini CLI
src/skills/*/SKILL.md the setup, focus, idea, decide and review skills (Agent Skills standard)
src/mod.test.ts       the mod's tests (claude plugin test)
tests/core.test.mjs   tests of the core, the CLI and the build output
build.mjs             builds three self-contained wrappers into plugins/
plugins/claude/helps  .claude-plugin/plugin.json, hooks/ (the mod), skills/, tests/
plugins/codex/helps   .codex-plugin/plugin.json, hooks/hooks.json, skills/, core/
plugins/gemini/helps  gemini-extension.json, hooks/hooks.json, skills/, commands/helps/*.toml, core/
.claude-plugin/marketplace.json   the Claude Code marketplace
.agents/plugins/marketplace.json  the Codex marketplace
```

`plugins/` and the marketplaces are build output; do not edit them by hand, run `npm run build`.
Raise the version in `src/core.js` and `package.json` with every change you push: installed
copies update only when the version changes.

```bash
npm test
```

```bash
(cd plugins/claude/helps && claude plugin test . && claude plugin validate .)
```

What has been checked, and how:

- automated on every push: the core, the CLI and the build (`npm test`) on Linux, macOS and
  Windows with Node 18 and 22; on Linux also the mod against the Claude Code engine
  (`claude plugin test`);
- by hand in Claude Code on Linux (terminal): install from this repository into a clean
  configuration, setup, the brake, decisions and answers, an alert line, the lamp turning yellow
  for an outside action;
- by hand in the desktop app on Windows: the band, setup and the lamp's colors, in a local
  session and over Remote Control to a Linux machine;
- not yet tried by a person: Claude Code on macOS, VS Code, the mobile app, and the Codex and
  Gemini wrappers on this version (their formats were checked against the CLIs' documentation).

See [CHANGELOG.md](CHANGELOG.md) for what changed between versions.
