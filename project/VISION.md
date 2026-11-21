---
template: vision/1
status: review   # draft | review | approved — the Product Owner approves
version: 0.1.0
date: 2026-11-21
owner: Product Owner (uaskpro)
---

# Product Vision — helps

## Statement

For people who run several projects and several AI coding-agent sessions at once, and who lose the
thread — new work pulls them away, decisions wait unseen, sessions drift or act on their own — helps
is an assistant inside the agent tool that keeps one main thing in front of them, saves everything
else for later, and shows with one lamp how each session is doing. Unlike task trackers and
dashboards, which ask the person to keep them up to date in another window, helps lives where the
work happens, asks with buttons, and needs no commands and no account.

## Audiences

| Audience | Gets |
|---|---|
| A solo developer or owner with many projects and agent sessions | one main thing kept in front of them, a brake on new work, decisions from every project in one place |
| A lead who delegates work to coding agents | a lamp per session that turns yellow or red when it works without them, acts outside on its own, is stuck, runs out of context or drifts |
| A person who finds such tools hard to keep up | plain words, pop-up buttons, nothing to learn or maintain |

## Outcomes

- **O-1** By 2026-12-31, a person who installs helps the documented way sees the lamp in every local
  Claude Code session (terminal and desktop app) on Linux, macOS and Windows, and sees it change
  colour on the signals the README lists.
- **O-2** In any four weeks of daily use, no new piece of work that pulls away from the main thing
  starts without being either saved for later or confirmed by the person ("do it now"), as the
  saved list and the session transcripts show.
- **O-3** In any four weeks of daily use, no decision addressed to the person in a listed project
  waits more than three days without the lamp saying so.
- **O-4** From 1.0.0, a session that works without the person, takes outside actions in turns it
  started itself, is stuck or drifts from what was asked shows it on its lamp within one turn.
- **O-5** By 2027-03-31, helps is listed in the official Claude Code plugin directory and installs
  from there with its lamp.

## Non-goals

- No account, server, telemetry or analytics: helps runs on the person's machine, in their tools.
- Not a task tracker or a project manager: one main thing, a list for later, decisions; nothing more.
- It never decides for the person and never stops a session on its own; only the person's Pause
  holds a session.
- No interface outside the agent tools (no web app, no mobile app of its own).
- Not a team product: one person, their machines and their sessions.

## Principles

- The person's attention is the scarce resource: one line, plain words, buttons, no noise.
- Text from project files is shown, never obeyed.
- Nothing leaves the machine except what the README lists, and each of those can be switched off.
