# helps

> [!WARNING]
> **BETA. WORK IN PROGRESS. NOT READY FOR EVERYDAY USE.**
> **THINGS WILL CHANGE AND BREAK WITHOUT NOTICE. PLEASE DO NOT INSTALL IT YET UNLESS YOU ARE HELPING TO TEST IT.**

An assistant for Claude Code, Codex and Gemini CLI. It keeps one main thing, saves everything else
for later and goes through the decisions waiting in your projects with you. It asks with pop-up
buttons and talks in plain words, so there are no commands to type.

## Install without a terminal

1. Open [claude.ai/customize/plugins](https://claude.ai/customize/plugins)
   (or in the Claude app: **Customize → Plugins**).
2. **Add → Add marketplace**, paste `uaskpro/helps`, confirm.
3. **helps** appears in the list: click **Add**.
4. Start a new Claude Code session (in the Claude app, the **Code** tab). The plugin comes along
   from your account.

Already in Claude Code (terminal, VS Code, the Code tab)? One line in the prompt does it:

```text
/plugin install helps --marketplace uaskpro/helps
```

Nothing else to install: in Claude Code helps runs entirely inside Claude Code, on Linux, macOS
and Windows.

## What it does

On first use the assistant asks three questions with buttons: what the main thing is now, what
"done" means, and what may be done right away. After that:

- every session starts with one line: "Main thing now: …";
- a request that pulls away from it is saved for later, with two buttons: "Back to the main
  thing" and "This matters more, do it now";
- once a day, if questions piled up in your projects: "Go through decisions (about 3 min)?",
  one at a time, with buttons; each answer is written into the project itself;
- once a week: "Look at saved items?" to keep, drop or make one the main thing;
- a lamp: 🟢 on track, 🟡 starting to drift, 🔴 going the wrong way, 🚨 emergency (blinks).
  In Claude Code it sits above the prompt in the terminal and the desktop app, with the reason
  and the buttons "Back to the main thing", "Go through decisions" and "Details", and in the
  status line on every screen, the Claude mobile app included. Codex and Gemini show the same
  color as a line at the start of the session.

The lamp is worked out from what helps already knows:

- 🟡 drifted off 3+ times today, decisions waiting over a day, 2 other projects touched today,
  the main thing quiet for 2 days;
- 🔴 drifted off 6+ times today, decisions waiting 3+ days, 3+ other projects touched today,
  the main thing quiet for 3+ days;
- 🚨 a line in any project's state file starts with `🚨`, `URGENT:` or `ALERT:`.

Run it by hand: `/helps:setup`, `/helps:focus`, `/helps:idea`, `/helps:decide`, `/helps:review`
(in Codex: `$setup` and so on), or just ask: "what is the main thing now?", "let's go through
the decisions".

Where it works:

- **Claude Code** (the Claude app's Code tab, terminal, VS Code): everything;
- **plain claude.ai chat and the phone**: advice in words only, there is nowhere to keep notes.

## Data

Outside the plugin, in `~/helps-data` (or `HELPS_DATA`), shared by all three assistants on the
machine:

| File | What |
|---|---|
| `FOCUS.md` | the main thing and what "done" means; your notes go below `## Notes` |
| `IDEAS.md` | saved for later, one line per idea |
| `inbox-sources.txt` | glob patterns of project state files where decisions come from |
| `config.json` | optional, see below |
| `state.json` | internal: answered decisions, when offers were made |

A decision is an item in a section of a project's `STATE.md` addressed to you: headings such as
"Waiting for owner", "Owner decisions", "Questions for the owner", "Blocked on owner". Answers are
written back into the same file, under `## Owner answers (helps)`.

State files in another language? Add their headings (regular expressions, case-insensitive) and
alert prefixes in `config.json`:

```json
{
  "owner_headings": ["wartet\\s+auf\\s+inhaber"],
  "siren_prefixes": ["DRINGEND:"]
}
```

## Layout

```
src/core.js           the core: one main thing, ideas, decisions, the lamp; no dependencies
src/register.js       the Claude Code mod: the mcp__helps__run tool, the main thing in the
                      system prompt, the lamp, /helps-lamp
src/cli.mjs           the core on the command line (Node), for Codex and Gemini CLI
src/skills/*/SKILL.md the setup, focus, idea, decide and review skills (Agent Skills standard)
src/mod.test.ts       the mod's tests (claude plugin test)
build.mjs             builds three self-contained wrappers into plugins/
plugins/claude/helps  .claude-plugin/plugin.json, hooks/ (the mod), skills/
plugins/codex/helps   .codex-plugin/plugin.json, hooks/hooks.json, skills/, core/
plugins/gemini/helps  gemini-extension.json, hooks/hooks.json, skills/, commands/helps/*.toml, core/
.claude-plugin/marketplace.json   the Claude Code marketplace
.agents/plugins/marketplace.json  the Codex marketplace
```

`plugins/` and the marketplaces are build output; do not edit them by hand, run `npm run build`.
Raise the version in `src/core.js` and `package.json` with every change you push: installed
copies update only when the version changes.

## Codex CLI and Gemini CLI

They run the same core through Node 18+ (Gemini CLI runs on Node anyway).

```bash
git clone https://github.com/uaskpro/helps.git ~/helps
node ~/helps/src/cli.mjs link    # puts a helps command into ~/.local/bin
```

**Codex CLI**

```bash
codex plugin marketplace add ~/helps
codex plugin add helps@uaskpro-helps
```

Then approve the plugin's hook once in `/hooks`: until then Codex does not run plugin hooks.
Skills: `$setup`, `$focus`, `$idea`, `$decide`, `$review`.

**Gemini CLI**

```bash
gemini extensions link ~/helps/plugins/gemini/helps --consent
```

Commands: `/helps:setup`, `/helps:focus`, `/helps:idea`, `/helps:decide`, `/helps:review`.

Update: `git -C ~/helps pull`, then `codex plugin marketplace upgrade` in Codex; the Gemini link
picks changes up by itself.

## Development

```bash
npm test                                            # core, CLI, build output
(cd plugins/claude/helps && claude plugin test)     # the mod: tool, prompt, lamp
claude plugin validate plugins/claude/helps && claude plugin validate .
```

Verified so far:

- `npm test` and `claude plugin test` pass on Linux; `claude plugin validate` passes for the
  plugin and the marketplace;
- a live `claude -p` session on Linux: the tool is there, the main thing is in the system prompt,
  setup and "saved for later" write their files;
- the first `claude -p` in a fresh process may start before mods are switched on; the mod then
  loads from the next turn;
- not yet verified live: Windows, macOS, the lamp in an interactive Claude Code session, Codex
  and Gemini on this version.
