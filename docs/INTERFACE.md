# The public interface of helps

What the version number protects (`config.semantic-versioning` R1). Anything listed here changes
only as the version says: a **breaking** change only in a MAJOR version, an addition or a
deprecation in a MINOR, fixes in a PATCH. A deprecated item keeps working for at least one MINOR
release. Everything not listed here is internal and may change in any release.

Status of this document: draft for helps 1.0.0. Until 1.0.0 is released (helps 0.99.x), it describes
the current behaviour, and changes may still be made without a MAJOR version.

## 1. What is public, in short

| Part | Public | Internal |
|---|---|---|
| Data folder | file names and formats of §2 | `state.json` |
| Project state files | owner headings, alert prefixes, the answers heading and line (§3) | — |
| Settings | the keys and values of `config.json` (§2.5); environment variables (§4) | default values may change in a MINOR, with a changelog line |
| Commands | names, options and JSON output of §5 | text output (without `--json`), wording |
| Claude Code | the tool name `mcp__helps__run`, the command `/helps-lamp`, the skill names (§6) | the band's wording, layout details, prompt text |

## 2. Data folder

`~/helps-data` (Windows: `%USERPROFILE%\helps-data`), or the folder in `HELPS_DATA`.

### 2.1 `FOCUS.md`

```text
# FOCUS

project: <the main thing, one line, ≤120 characters>
finish: <what "done" means, one line, ≤200 characters>
since: <YYYY-MM-DD>
allow: <kinds of work that need no question, one line, ≤200 characters>

## Notes
<anything; kept as it is, never added to a session>
```

Fields are `name: value`, one line each. Everything from the first `## ` heading on belongs to the
person and survives every change helps makes.

### 2.2 `IDEAS.md` and `IDEAS-done.md`

One idea per line: `- YYYY-MM-DD HH:MM [<by>] <text>`, where `<by>` is `a-z0-9_-`, up to 20
characters (`claude`, `codex`, `gemini`, `owner`, …). A dropped idea moves to `IDEAS-done.md` with
`  → dropped YYYY-MM-DD` appended.

### 2.3 `inbox-sources.txt`

Paths or glob patterns of Markdown state files, one per line; `#` starts a comment; `~` is the home
folder. The project's name is the name of the folder that holds the file. Only `*.md` files count.

### 2.4 `state.json`

Internal. May change in any release; do not edit or read it from other tools.

### 2.5 `config.json`

All keys optional; a value of the wrong type is ignored.

| Key | Type | Meaning |
|---|---|---|
| `owner_headings` | array of strings | extra regular expressions (case-insensitive) for owner headings (§3) |
| `siren_prefixes` | array of strings | extra alert prefixes (§3) |
| `session.without_you_yellow_min`, `session.without_you_red_min` | number | minutes of work without the person for yellow, red |
| `session.outside_yellow`, `session.outside_red` | number | outside actions in own turns for yellow, red |
| `session.stuck_repeats` | number | repeats of a failing command for yellow |
| `session.long_command_min` | number | minutes of one command for yellow |
| `session.context_yellow`, `session.context_red` | number | context use in per cent |
| `session.drift_check` | boolean | the drift check on or off |
| `session.drift_every_turns`, `session.drift_every_min` | number | how often the drift check may run |
| `session.update_check` | boolean | the version check on or off |
| `band.size` | `small` \| `smallest` \| `normal` | text size of the band |
| `band.layout` | `lamp` \| `line` \| `full` | what the band shows |

## 3. Project state files

- **Owner headings.** A Markdown heading (any level) whose text matches, case-insensitive:
  "waiting for/on (the) owner", "owner decision(s)", "need(s) (the) owner", "for the owner",
  "question(s) for (the) owner", "blocked on (the) owner", "decision(s) needed", or a pattern from
  `owner_headings`. Each list item under it, up to the next heading of the same or a higher level,
  is one decision. A checked item (`- [x]`) is done and skipped. Code blocks are not headings.
- **Alert prefixes.** A line that starts with `🚨`, `URGENT:`, `ALERT:` or a prefix from
  `siren_prefixes` turns the lamp into an alert naming the project. Its text is shown to the person
  and never given to a session.
- **Answers.** helps writes each answer as one line under the heading `## Owner answers (helps)`,
  newest first, creating the heading at the end of the file if needed:
  `- YYYY-MM-DD: "<question, up to 120 characters>" → <answer>`. The file's line endings are kept.

## 4. Environment variables

| Variable | Effect |
|---|---|
| `HELPS_DATA` | the data folder |
| `HELPS_PROJECT_ROOTS` | folders whose subfolders are projects, for `scan` and setup, separated like `PATH`; by default the current folder, its parent and `~/projects`, `~/Projects`, `~/code`, `~/src`, `~/dev`, `~/Documents`, `~/Desktop`, `~` |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | when set, the version check is off |

## 5. Commands

The same commands in the `helps` CLI (Codex, Gemini, a terminal) and in the Claude Code tool
`mcp__helps__run` (arguments as a list of words).

| Command | Options | Output |
|---|---|---|
| `init` | — | text |
| `context` | `--agent claude\|codex\|gemini\|other`, `--format json\|text` | the session context. In the CLI, `--format json` (default) prints the SessionStart hook JSON and `text` the plain text; `json` also marks today's offers as made |
| `status` | — | JSON: the main thing, counts |
| `health` | `--json` | the main thing's lamp; JSON with `lamp`, `level`, `headline`, `reasons` |
| `setup` | `--project`, `--finish` (required), `--allow`, `--source` (repeatable), `--sources-from-scan` | JSON: `project`, `finish`, `sources_added`, `decisions_waiting` |
| `focus` | `--set`, `--finish`, `--allow` | without `--set`: JSON as `status` |
| `idea` | `<text>`, `--by <who>` | text |
| `ideas` | `--json`, `--last N`, `--drop N` | JSON: list of `{n, text}` |
| `reviewed` | — | text |
| `decisions` (alias `inbox`) | `--json` | JSON: list of `{id, project, file, age_days, question}` |
| `answer` | `<id> <text>` | text; in Claude Code only after the person's choice (FR-11) |
| `scan` | — | JSON: projects found near the current folder |
| `sources` | `--add <pattern>` (repeatable) | the list of sources |
| `doctor` | — | text: version, data folder, main thing, decision sources; in Claude Code also the surfaces where a lamp can be drawn |
| `--version` (alias `version` in the CLI) | — | the version |
| `link` (CLI only) | `--dir <folder>` (default `~/.local/bin`), `--force` | puts a `helps` command on PATH: a symlink, or `helps.cmd` on Windows |

Exit codes of the CLI: 0 success; 2 an error or wrong usage (the reason on stderr); `link` returns 1 when
the target exists and `--force` is not given. `context` always exits 0 (a hook must not block a session
start); on an error it prints `{}` and the reason on stderr. A field may be added to a JSON output in a
MINOR release; removing or renaming one is breaking.

## 6. Claude Code

- Tool: `mcp__helps__run` (input: `{"args": ["<command>", "<arg>", …]}`).
- Command: `/helps-lamp` (opens the lamp's Details).
- Skills: `helps:setup`, `helps:focus`, `helps:idea`, `helps:decide`, `helps:review`.
- The band above the prompt and its buttons are user interface, not an interface for programs.
