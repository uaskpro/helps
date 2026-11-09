# Changelog

## 0.99.1

- **Realign**: a button that tells the session to check itself against the project's own rules,
  list where it left them, put its process right and carry on. What the lamp recorded goes along.

## 0.99.0 — release candidate

A full review before 1.0: security, the Claude Code mod, and the path of a first-time user.

**The lamp**
- "Working without you" counts only turns the session started itself; hours inside a turn you
  asked for no longer turn it yellow.
- Outside actions count as the session's own only in such turns. Subagents your turn spawned
  work at your word. Tools of connected services that send or change something count too.
- **Pause** now works at once: tool calls are refused until you write or press Resume.
- The status line no longer repeats the band; toasts only when the lamp turns red; an alert
  blinks for a minute, then stays lit; the band yields to a survey.
- Secrets in command lines are masked before they are shown or sent to the drift check.
- No model or network calls where nobody can see a lamp (scripts, cloud sessions).
- The main thing's state is re-read every five minutes instead of every thirty seconds, and a
  slow disk no longer holds up the first prompt.

**Safety**
- Text from project files (alert lines, folder names) is never put into a session's
  instructions.
- An answer to a decision goes into a project without a permission question only when you have
  just answered with buttons; otherwise Claude Code asks first.
- Decision sources are Markdown files only; a link may not lead a Markdown name elsewhere.
- Values are stored as one plain line each; glob patterns cannot run away or crash.
- The helps block in the session's instructions tells subagents and teammates to ignore it.

**The main thing**
- The brake asks once per new piece of work and never interrupts work already under way.
- Other projects touched today are a nudge (yellow), never an alarm.
- The first review is offered a week after the first idea, not on day one.
- Code blocks in state files are not headings; checked boxes are done; "Later" writes nothing.

**Platforms**
- Windows: network shares (`\\server\share`), folders with brackets in their names, CRLF files
  and files with a byte-order mark; the Codex hook has a Windows command.
- The CLI writes files through links and keeps their permissions.

## 0.6

The lamp shows how each session is doing instead of the state of your work as a whole. Notice of
a newer version. An independent review of the session logic.

## 0.5

One core in JavaScript for Claude Code, Codex CLI and Gemini CLI. Claude Code runs it inside the
mod: nothing to install.
