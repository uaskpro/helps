---
id: ADR-0001
title: One core in JavaScript for all tools; no Python
status: accepted
date: 2026-11-21
deciders: Product Owner
owner-level: yes
supersedes: ~
superseded_by: ~
---

# ADR-0001: One core in JavaScript for all tools; no Python

Owner-level: yes · Decision-makers: Product Owner (accepts), lead (proposes)

## Context and problem

helps runs in Claude Code (as a mod), Codex CLI and Gemini CLI (as hooks and a CLI). Version 0.1
had a Python core and Python hooks. Claude Code mods are JavaScript modules run by the engine;
Codex and Gemini run any command. Serves NFR-6, NFR-9.

## Options considered

1. **Keep the Python core**, call it from the mod as a process — needs Python on every machine and a
   process per call from inside the engine.
2. **One JavaScript core with an `io` object**, used unchanged by the mod (engine file API), the Node
   CLI and the tests.
3. **Two cores** (JavaScript for the mod, Python for the CLIs) — every rule written twice.

## Decision

Option 2. One core in JavaScript without dependencies; each wrapper passes its own `io`
(blueprint §4, DR-1).

## Consequences

- Good: one place for every rule; the mod needs nothing installed; Node 18+ is enough for the CLIs.
- Bad / cost: the CLIs need Node; Python users get no native package.
- Confirmation: FF-2 (no imports or Node globals in the core), FF-3 (no dependencies).

## Evidence

- helps 0.1 (2026-11-08) had a Python core and hooks; 0.5.0 replaced them with `src/core.js`.
- Claude Code plugin reference, mods (`hooks/register.js` is a JavaScript module run by the engine), read 2026-11-14.
- FF-2 and FF-3 pass on every push (`tools/fitness.mjs`).

## Owner decision

Decision in force since 2026-11-08 (source: the owner's message in the session that built helps 0.5.0,
2026-11-08, translated: "no Python"; helps 0.5.0 rewritten on it). Recorded afterwards on 2026-11-21. Accepted by the Product Owner on 2026-11-21 with a button ("accept all six", translated), in the
session that prepares helps 1.0.0.
