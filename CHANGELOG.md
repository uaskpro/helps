# Changelog

All notable changes for users. Versions follow [Semantic Versioning](https://semver.org) against
the public interface in [docs/INTERFACE.md](docs/INTERFACE.md).

## 1.0.1

Fixes found by two outside reviews of 1.0.0. Nothing to do on update.

- **Security:** in Claude Code, helps now asks you the project's own question itself and writes
  exactly the option you pick (or what you type). Before, a button answer to any question let a
  session write any answer to any decision for 30 minutes. A session that writes an answer directly
  gets helps' own confirmation, with the question and the whole answer.
- Several sessions saving at the same moment no longer lose ideas, sources or answers: writes take a
  lock on the data folder (an exclusive lock file in Codex, Gemini and the `helps` command; a queue
  inside each Claude Code session; a token lock between Claude Code sessions; see the README for the
  two limits). A lock left by a stopped process is taken over after 5 seconds.
- Two answers to one decision at the same moment: only the first goes in. "Later", "Skip" and a
  dialog closed with a note only write nothing. helps' question names the folder above the project,
  so two projects with the same name can be told apart.
- A decision counts as answered when its answer line is in the project's file.
- A decision's age counts from when helps first saw it; before, any edit of the file made old
  questions look new.
- While paused, helps' own commands that change data are refused too, in every spelling.
- Outside actions: `gh api` with fields or a GraphQL mutation, `gh pr create`, `gh repo edit`,
  `gh workflow run`, `gh issue comment`, `gh release upload`, `gh secret set`, joined curl options
  (`-XPOST`, `-sXPOST`, `-d@file`, `-sd`) and a curl write to a URL in a variable are counted; GraphQL
  queries and `curl -u user:pw` are not.
- The README says what green means, what Pause does not stop, and what helps does not guard: answers
  outside Claude Code, and a session that edits a project's file itself.

## 1.0.0

The first stable release. Nothing changes in how helps works compared with 0.99.3; what changes is
the promise: from now on the version number says what an update can break.

- The public interface is written down: data files, settings, state-file conventions, commands and
  their JSON output ([docs/INTERFACE.md](docs/INTERFACE.md)). From 1.0.0 it changes only as the
  version number says.
- Every earlier version has a tag (`v0.5.0` … `v0.99.3`), so any of them can be installed again
  ([project/RELEASING.md](project/RELEASING.md), Rollback). From now on a released version never
  changes.
- Releases are built and tagged by CI from the merged commit, with archives and SHA-256 checksums.
- One check script, the same locally and in CI (`npm run gate`); it now also runs the mod tests
  against Claude Code, which the README already claimed.
- Security policy (report privately on GitHub), issue templates, a contributing guide, and a
  screenshot of the lamp.
- Project documents: vision, requirements, architecture, decisions, test strategy, release process.

## 0.99.3

- License: MIT.
- The plugin has an icon and a README of its own that lists what it runs, reads, writes, sends
  and fetches, ready for the official plugin directory.
- Install: one way, through Claude Code. Adding helps on claude.ai (**Customize → Plugins**) is
  not supported for now: the copy synced from the account arrives without the lamp and hides the
  installed one.

## 0.99.2

- The band above the prompt is smaller and shorter out of the box: small text, the lamp, the top
  reason and **Details**. The other buttons moved into Details; **Set up helps** and **Resume**
  stay on the band when they are needed.
- The look is a setting: `"band": {"size": "small|smallest|normal", "layout": "lamp|line|full"}`
  in `config.json`. `"layout": "full", "size": "normal"` is the band as it was in 0.99.1.

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
