---
id: ADR-0002
title: English only in the repository
status: accepted
date: 2026-11-21
deciders: Product Owner
owner-level: yes
supersedes: ~
superseded_by: ~
---

# ADR-0002: English only in the repository

Owner-level: yes (publication of material) · Decision-makers: Product Owner (accepts), lead (proposes)

## Context and problem

The repository is public and meant for users anywhere. The owner works in Russian; earlier history
had Russian commits and texts. Serves NFR-11.

## Options considered

1. **English only**: code, docs, commits, interface; other languages through `config.json` settings.
2. **Bilingual docs** — every text kept twice.
3. **Keep the mixed history** as it was.

## Decision

Option 1. The history was rewritten into one English commit (0.5.0); the owner's Russian headings
and alert prefixes live in his `config.json`, not in the code.

## Consequences

- Good: one audience-wide language; no stray traces of private context.
- Bad / cost: Russian-speaking users read English docs; the interface is English.
- Confirmation: FF-6 in the gate fails on Cyrillic text in any tracked text file; review of each
  pull request for other languages.

## Evidence

- History rewritten into one English commit for 0.5.0 (2026-11-08); FF-6 finds no Cyrillic text in the repository (2026-11-21).

## Owner decision

Decision in force since 2026-11-08 (source: the owner's message in the session that built helps 0.5.0,
2026-11-08: only English in the repository, no traces of Russian; history rewritten on his yes).
Recorded afterwards on 2026-11-21. Accepted by the Product Owner on 2026-11-21 with a button ("accept all six", translated), in the
session that prepares helps 1.0.0.
