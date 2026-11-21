---
template: prd/1
status: draft    # draft until the vision is approved (mgmt.project-foundation R2), then review
version: 0.2.0
date: 2026-11-21
vision: VISION.md 0.2.0
owner: Product Owner (uaskpro)
---

# PRD — helps

Keywords MUST, SHOULD, MAY follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) /
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174). Ids (`S-…`, `FR-n`, `NFR-n`, `AC-n`; outcomes are
`O-n` in the vision) are stable, never reused, and referenced from the blueprint, tests and releases.
Defaults named below are the shipped values of `~/helps-data/config.json` ([docs/INTERFACE.md](../docs/INTERFACE.md)).

## Problem

A person who runs several projects and coding-agent sessions at once loses the thread: a new idea
becomes new work before the current thing is done; questions that agents leave for the person wait
in files nobody opens; a session goes on for hours without the person, pushes or deploys on its own,
loops on the same failure, or slowly does something other than what was asked. Each of these costs
hours or days, and the person notices too late, because the signs are spread over many windows.

## Users and context

One person with Claude Code (terminal, desktop app, Remote Control), sometimes Codex CLI or Gemini
CLI, on Linux, macOS or Windows; projects keep their state in Markdown files (`STATE.md`). The
agent sessions are the person's own; some run for hours without them.

## Scenarios

| ID | Scenario | Actor | Inputs | Result | Outcome |
|---|---|---|---|---|---|
| S-A | Set up | person | "set up helps"; the main thing and what "done" means | main thing saved; state files of projects found and listed | O-1, O-2 |
| S-B | Brake | person, session | a request that pulls away from the main thing | the gist saved for later and two buttons: back, or do it now | O-2 |
| S-C | Lamp of a session | session | turns, tool calls, context use, the person's messages | a band above the prompt: colour, top reason, details | O-1, O-4 |
| S-D | Decisions | person | open questions under owner headings in listed state files | one question at a time with buttons; the answer written back into that file | O-3 |
| S-E | Weekly review | person | the saved list | keep, drop or make the main thing, item by item | O-2 |
| S-F | Alert | project file | a line that starts with an alert prefix | the lamp becomes 🚨 and names the project | O-3 |
| S-G | Pause | person | the Pause button | the session's tool calls are held until the person writes | O-4 |
| S-H | Realign | person | the Realign button | the session re-reads its project rules, lists its deviations and goes on | O-4 |
| S-I | Update notice | helps | a newer published version | the band says so and how to update | O-1 |
| S-J | Codex and Gemini | person | a session start in Codex CLI or Gemini CLI | the main thing and the brake as session context; skills for the rest | O-2 |
| S-K | Diagnose | person | "run helps doctor" | version, data folder, surfaces where a lamp can be drawn | O-1 |
| S-L | Install | person | the install line | helps installed with its lamp | O-1, O-5 |

## Functional requirements

| ID | Requirement | Scenario | State |
|---|---|---|---|
| FR-1 | Setup MUST save the main thing and its "done" text and MUST list the `STATE.md` files of projects found in the project folders (`docs/INTERFACE.md` §4, `HELPS_PROJECT_ROOTS`), in under one minute of the person's time. | S-A | done |
| FR-2 | When a request pulls away from the main thing and is not of a kind the person allowed, the session MUST save its gist for later and offer "back to the main thing" and "do it now" before starting it, once per piece of work. | S-B | done |
| FR-3 | Each Claude Code session MUST show a band above the prompt with a lamp (green, yellow, red, alert), the top reason and Details. | S-C | done |
| FR-4 | The lamp MUST turn yellow at 30 and red at 120 minutes of work without the person (defaults). | S-C | done |
| FR-5 | The lamp MUST count outside actions (ssh, scp, rsync, push, merge, deploy, provisioning, API writes) only in turns the session started itself, yellow at 1 and red at 3 (defaults), and MUST list each action with its time in Details. | S-C | done |
| FR-6 | The lamp MUST turn yellow when the session repeats a failing command 3 times (red at 6). | S-C | done |
| FR-21 | The lamp MUST turn yellow when one command runs 5 minutes or longer. | S-C | done |
| FR-22 | The lamp MUST turn yellow at 50 % context use and red at 75 %. | S-C | done |
| FR-7 | The drift check MUST ask a small model whether the session still does what the person asked, at most every 3 turns and every 10 minutes, and MAY raise the lamp to yellow, never higher. | S-C | done |
| FR-8 | A message from the person MUST reset the counters of FR-4, FR-5 and FR-6. | S-C | done |
| FR-9 | The main thing's own state (decisions waiting, alerts, other projects touched today) MUST appear in grey beside the lamp, with its reasons in Details. | S-C, S-D | done |
| FR-10 | helps MUST collect decisions as list items under owner headings of listed state files, skip checked items, and present them one at a time with buttons. | S-D | done |
| FR-11 | An answer MUST be written into the asking file under `## Owner answers (helps)` only after the person chose it with buttons or confirmed it in a dialog; otherwise the write MUST be refused. | S-D | done |
| FR-12 | The saved list MUST support keep, drop and make-the-main-thing, and MUST record the date of the review. | S-E | done |
| FR-13 | A line in a listed state file that starts with an alert prefix MUST turn the lamp to alert and name the project, without passing the line's text to the session as an instruction. | S-F | done |
| FR-14 | Pause MUST hold every tool call of the session until the person's next message. | S-G | done |
| FR-15 | Realign MUST send the session the request to re-read its rules, list deviations since the person's last message, and continue, with what the lamp recorded attached; pressing it counts as the person speaking. | S-H | done |
| FR-16 | helps MUST check for a newer published version at most every 6 hours and show it beside the lamp with how to update. | S-I | done |
| FR-17 | In Codex CLI and Gemini CLI, a session start MUST give the main thing and the brake as context, and the five skills MUST work through the CLI. | S-J | done (not tried by a person on 0.99) |
| FR-18 | `helps doctor` MUST report the version, the data folder and the surfaces where a lamp can be drawn. | S-K | done |
| FR-19 | The look of the band MUST be a setting: size small, smallest or normal; layout lamp, line or full. | S-C | done |
| FR-20 | helps MUST install with its lamp from the official Claude Code plugin directory. | S-L | waiting (directory listing) |

## Non-functional requirements

| ID | Quality attribute (ISO/IEC 25010) | Requirement |
|---|---|---|
| NFR-1 | security | Text read from project files MUST NOT be placed into a session's instructions; at most "an alert line in project X". Verified by mod tests. |
| NFR-2 | security | helps MUST write only: its data folder; per FR-11, one line into a listed state file (the CLI writes a temporary file beside it and renames it over the original); and, only when the person runs `helps link`, one command file in the folder they name. |
| NFR-3 | security (privacy) | Nothing MUST leave the machine except the drift check (the person's last 3 messages and the last reply, as written, and the last 12 shell commands with secrets masked, sent through the person's own Claude Code account) and the version check (a GET of helps' own `plugin.json` on GitHub). Both MUST be switchable off, and neither MUST run while no lamp is visible. |
| NFR-4 | reliability | A failure inside helps MUST NOT stop or break the session: the session goes on without a lamp. |
| NFR-5 | performance efficiency | The drift check MUST time out after 30 s and request at most 150 output tokens; the main thing's state is recomputed at most every 5 minutes. |
| NFR-6 | compatibility | The mod MUST work with Claude Code 2.1.321 or newer in the terminal and the desktop app on Linux, macOS and Windows; the CLI MUST work with Node 18 or newer. |
| NFR-7 | interaction capability | Every question to the person MUST be a pop-up with 2–4 buttons, the recommended one first; texts MUST use plain words, without internal terms. |
| NFR-8 | interaction capability (accessibility) | The lamp's colour MUST never be the only signal: the top reason is always written next to it. |
| NFR-9 | maintainability | The core MUST have no runtime dependencies and MUST be shared, unchanged, by the Claude, Codex and Gemini wrappers. |
| NFR-10 | flexibility | The data folder MUST be movable (`HELPS_DATA`) and shareable between machines and between the three tools. |
| NFR-11 | licensing | helps MUST be released under the MIT licence, and the repository MUST hold only English text. |
| NFR-12 | operability | A released version MUST never change; an update or a return to an earlier version MUST be possible from released tags. |

## Acceptance criteria

Each names the ids it proves, the method, the environment, the expected result and who performs it.
"Automated" means a test in the gate (`npm run gate`, [TEST-STRATEGY.md](TEST-STRATEGY.md)); the test is
named in quotes (core tests in `tests/core.test.mjs`, mod tests in `src/mod.test.ts`).

- [ ] **AC-1** (FR-1) By hand: clean configuration, empty data folder, a folder with two projects that
  have `STATE.md`: "set up helps", answer the questions. Expected: `FOCUS.md` written, both state files
  listed, finished within 60 s of the person's time. Environment: Claude Code terminal, Linux. By: the
  lead, before each MINOR or MAJOR release. Automated part: core "setup, scan and sources".
- [ ] **AC-2** (FR-2) Automated: core "not set up: offers setup with buttons", "set up: the main thing and
  the way out"; mod "changing the main thing updates the session's instructions". Expected: the brake rule and the two buttons
  are in the session's instructions.
- [ ] **AC-3** (FR-3, FR-19, NFR-8) Automated: mod "a calm session is green and names itself…", "out of
  the box the band is small and short…", "the band's look is a setting…". Expected: a colour and a
  written reason in every layout. By hand: the band is visible in the terminal (lead) and in the desktop
  app (owner) before each release.
- [ ] **AC-4** (FR-4 – FR-8, FR-21, FR-22) Automated: mod "outside actions on its own…", "in reply to you
  an outside action is yours…", "hours inside the turn you asked for are fine…", "stuck: the same
  command failing…", "a full context window is red", "drift check: yellow with the reason, never red",
  "your message starts the count over"; core "the session lamp: thresholds, worst first, drift never
  red", "outside actions: …". Expected: each threshold gives its colour; the person's message resets.
- [ ] **AC-5** (FR-9, FR-10, FR-13, NFR-1) Automated: core "owner items: code blocks are not headings,
  checked boxes are done", "text from files never reaches the session instructions", "an alert line
  wins"; mod "an alert line blinks, and its text stays out of the session…". Expected: decisions and
  alerts reach the band; no file text in the instructions.
- [ ] **AC-6** (FR-11, NFR-2) Automated: mod "an answer goes into a project only with your hand on it";
  core "an answer keeps the file…", "decisions and answers". Expected: refused without the person's
  choice; with it, one line under the answers heading and nothing else changed.
- [ ] **AC-7** (FR-14, FR-15) Automated: mod "Pause works at once: tool calls are refused until you
  write", "Realign: the session is told to check itself…". Expected as stated.
- [ ] **AC-8** (FR-16, NFR-3) Automated: mod "a newer published version shows beside the lamp…", "nobody
  watching (a script, a cloud session): no model calls, no network…"; core "version comparison for the
  update notice". The 6-hour limit and the two switches are checked by review of `src/register.js`
  (TD-6). Expected: no send without a visible lamp.
- [ ] **AC-9** (FR-17) By hand on the release candidate: Codex CLI and Gemini CLI start a session with
  the main thing in context. By: the lead. Until it is done, the release notes say "not tried by a
  person".
- [ ] **AC-10** (FR-20, O-5) By hand after listing: install from the directory into a clean
  configuration; the lamp shows in a new session. By: the owner.
- [ ] **AC-11** (NFR-4) Automated: core "the session start survives broken data"; mod "tool: errors come
  back as plain text". A general test that an exception in any mod handler is contained is missing (TD-2).
- [ ] **AC-12** (NFR-12) Automated: FF-1 passes: the built plugin under a released version equals its tag.
- [ ] **AC-13** (FR-12) Automated: core "ideas: save and drop", "a review is offered a week after the
  first idea…". Expected: drop moves the line to `IDEAS-done.md`; the review date is recorded.
- [ ] **AC-14** (FR-18) By hand: "run helps doctor" in a terminal session prints the version, the data
  folder and the surfaces. By: the lead, each release.
- [ ] **AC-15** (NFR-5) By review of `src/register.js`: the drift call has `maxTokens: 150` and a 30 s
  timeout; the main thing's state is cached for 5 minutes. By: the verifier of each change to it.
- [ ] **AC-16** (NFR-6, NFR-9) Automated: the gate on 6 CI jobs (Linux, macOS, Windows × Node 18, 22)
  and FF-4 on Claude Code 2.1.321; FF-2, FF-3. Expected: all green.
- [ ] **AC-17** (NFR-7) By review: every question the skills ask is an AskUserQuestion with 2–4 options,
  the recommended first. By: the verifier of each change to `src/skills/`.
- [ ] **AC-18** (NFR-10) Automated: the core tests run with `HELPS_DATA` pointing at a temporary folder
  and find the data there ("setup, scan and sources"). By review: no code path writes data outside
  `HELPS_DATA` (NFR-2).
- [ ] **AC-19** (NFR-11) Automated: FF-6 (no Cyrillic); `claude plugin validate` reads the manifest;
  by review: `LICENSE` is MIT.

## Constraints and assumptions

- Constraint: the mod API of Claude Code (`hooks/register.js`) is the only way to draw the band;
  it is documented for plugins and may change (risk RK-1 in the blueprint).
- Constraint (owner): English only in the repository; no Python (ADR-0001, ADR-0002).
- Assumption: plugins added on claude.ai keep coming to local sessions without `hooks/`. Check:
  AC-10, after the directory listing, by 2027-03-31; who: the owner.

## Out of scope

Not goals of the product (from the vision's non-goals):

- Telemetry, accounts, a server, a web or mobile interface of its own.
- Teams and shared dashboards; task tracking beyond one main thing and a list for later.

Deferred, not in 1.0.0:

- A lamp in cloud sessions: the cloud session gives a mod no surface today. Revisit when it does.
- Installing through claude.ai **Customize → Plugins**: after the directory listing (ADR-0004, AC-10).
- Checked support for VS Code and the mobile app: 1.1.0 (roadmap M3).

## Open questions

- Is the lamp drawn in VS Code and over the mobile app? Who: the lead, by hand, before 1.1.
