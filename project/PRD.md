---
template: prd/1
status: review   # draft | review | approved — the Product Owner approves
version: 0.1.0
date: 2026-11-21
vision: VISION.md 0.1.0
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
| FR-1 | Setup MUST save the main thing and its "done" text and MUST list the `STATE.md` files of projects found from the current folder and its parent, in under one minute of the person's time. | S-A | done |
| FR-2 | When a request pulls away from the main thing and is not of a kind the person allowed, the session MUST save its gist for later and offer "back to the main thing" and "do it now" before starting it, once per piece of work. | S-B | done |
| FR-3 | Each Claude Code session MUST show a band above the prompt with a lamp (green, yellow, red, alert), the top reason and Details. | S-C | done |
| FR-4 | The lamp MUST turn yellow at 30 and red at 120 minutes of work without the person (defaults). | S-C | done |
| FR-5 | The lamp MUST count outside actions (ssh, scp, rsync, push, merge, deploy, provisioning, API writes) only in turns the session started itself, yellow at 1 and red at 3 (defaults), and MUST list each action with its time in Details. | S-C | done |
| FR-6 | The lamp MUST turn yellow when the session repeats a failing command 3 times or a command runs 5 minutes or longer, and when context use reaches 50 % (red at 75 %). | S-C | done |
| FR-7 | The drift check MUST ask a small model whether the session still does what the person asked, at most every 3 turns and every 10 minutes, and MAY raise the lamp to yellow, never higher. | S-C | done |
| FR-8 | A message from the person MUST reset the counters of FR-4 to FR-6. | S-C | done |
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
| NFR-2 | security | helps MUST write only its data folder and, per FR-11, one line into a listed state file. |
| NFR-3 | security (privacy) | Only two things MUST leave the machine: the drift check (last 3 messages of the person, the last reply, the last 12 shell commands with secrets masked, sent through the person's own Claude Code account) and the version check (a GET of helps' own `plugin.json` on GitHub). Both MUST be switchable off, and neither MUST run while no lamp is visible. |
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

Method, environment, expected result and who performs each. "Automated" criteria run in the gate
(`npm run gate`, [TEST-STRATEGY.md](TEST-STRATEGY.md)).

- [ ] **AC-1** (FR-1) Clean configuration, empty data folder, a folder with two projects that have
  `STATE.md`: "set up helps", answer the questions. Expected: `FOCUS.md` written, both state files
  listed, finished within 60 s of the person's time. Environment: Claude Code terminal, Linux.
  Performed by: the lead before each MINOR or MAJOR release.
- [ ] **AC-2** (FR-2) Automated: a request outside the main thing produces the idea record and the
  two buttons once per piece of work; a follow-up does not ask again.
- [ ] **AC-3** (FR-3, FR-19, NFR-8) Automated: the band renders in each layout and size with a
  colour and a written reason. By hand: the band is visible in the terminal and in the desktop
  app. Performed by: the lead (terminal) and the owner (desktop app) before each release.
- [ ] **AC-4** (FR-4 – FR-8) Automated: each threshold raises the lamp to the stated colour, a
  message of the person resets it, outside actions in the person's turns are not counted.
- [ ] **AC-5** (FR-9, FR-10, FR-13) Automated: decisions and alerts from listed files reach the
  band and Details; checked items are skipped; alert text is not in the session's instructions.
- [ ] **AC-6** (FR-11, NFR-2) Automated: an answer without the person's choice is refused; with it,
  one line is written under the answers heading and nothing else changes in the file.
- [ ] **AC-7** (FR-14, FR-15) Automated: Pause holds tool calls until the person writes; Realign
  sends the request with the lamp's record.
- [ ] **AC-8** (FR-16, NFR-3) Automated: the version check runs at most every 6 h and not with
  `update_check: false` or `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`; the drift check is off with
  `drift_check: false`; nothing is sent without a visible lamp.
- [ ] **AC-9** (FR-17) By hand on the release candidate: Codex CLI and Gemini CLI start a session
  with the main thing in context. Performed by: the lead. Until it is done, the release notes say
  "not tried by a person".
- [ ] **AC-10** (FR-20, O-5) After listing: install from the directory into a clean configuration;
  the lamp shows in a new session. Performed by: the owner.
- [ ] **AC-11** (NFR-4) Automated: broken data at session start, and an error in helps' own tool,
  leave the session working (the tool answers in plain text). A general test that an exception in
  any handler is contained is missing: TD-2 in the blueprint.
- [ ] **AC-12** (NFR-12) The gate's FF-1 passes: the built plugin under a released version equals
  its tag.

## Constraints and assumptions

- Constraint: the mod API of Claude Code (`hooks/register.js`) is the only way to draw the band;
  it is documented for plugins and may change (risk RK-1 in the blueprint).
- Constraint (owner): English only in the repository; no Python (ADR-0001, ADR-0002).
- Assumption: plugins added on claude.ai keep coming to local sessions without `hooks/`. Check:
  after the directory listing (AC-10).

## Out of scope

- Telemetry, accounts, a server, a web or mobile interface of its own (vision non-goals).
- A lamp in cloud sessions: the cloud session has no surface for it.
- Teams and shared dashboards; task tracking beyond one main thing and a list for later.
- Installing through claude.ai **Customize → Plugins** until the directory listing (ADR-0004).

## Open questions

- Is the lamp drawn in VS Code and over the mobile app? Who: the lead, by hand, before 1.1.
