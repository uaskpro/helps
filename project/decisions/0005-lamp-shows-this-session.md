---
id: ADR-0005
title: The lamp shows this session; the main thing beside it
status: proposed
date: 2026-11-21
deciders: Product Owner
owner-level: yes
supersedes: ~
superseded_by: ~
---

# ADR-0005: The lamp shows this session; the main thing beside it

Owner-level: yes (product scope) · Decision-makers: Product Owner (accepts), lead (proposes)

## Context and problem

Until 0.5 the lamp showed the main thing as a whole (other projects touched, decisions waiting).
In every session it looked the same and said nothing about the session in front of the person.
Serves FR-3 – FR-9, O-4.

## Options considered

1. **The lamp is this session's state** (without the person, outside actions in its own turns,
   stuck, context, drift); the main thing's state in grey beside it, its reasons in Details.
2. **Keep the main thing's lamp** in every session.
3. **Two lamps** side by side — more to read on one short line.

## Decision

Option 1 (helps 0.6.0).

## Consequences

- Good: each session tells its own story; the main thing is still visible.
- Bad / cost: thresholds need tuning (they are settings); counting "own turns" needs care
  (tests for subagents and background tasks).
- Confirmation: mod tests (FF-4).

## Owner decision

Decision in force since 2026-11-09 (source: the owner's brief for helps 0.6.0, 2026-11-09: the lamp
is the state of this session). Recorded afterwards on 2026-11-21; awaiting the owner's confirmation
of this record.
