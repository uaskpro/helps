---
id: ADR-0006
title: Drift check through a small Claude model on the person's account
status: accepted
date: 2026-11-21
deciders: Product Owner
owner-level: yes
supersedes: ~
superseded_by: ~
---

# ADR-0006: Drift check through a small Claude model on the person's account

Owner-level: yes (sends data off the machine, costs the person's usage) · Decision-makers: Product
Owner (accepts), lead (proposes)

## Context and problem

Whether a session still does what the person asked cannot be read from counters. A model can
judge it from the last messages and commands. Serves FR-7, NFR-3, NFR-5, O-4.

## Options considered

1. **A small Claude model through the engine (`$.model.complete`, alias `haiku`)**, on the person's
   own account: no key, no server; ≤150 output tokens, ≤ every 3 turns and 10 minutes, 30 s limit;
   never more than yellow; switch `drift_check`.
2. **No drift check** — only counters.
3. **A service of ours** — a server and data leaving to us; against the vision.

## Decision

Option 1. It is the only way to see drift that counters miss without a server of ours or a key
from the person; the limits keep the cost small, the lamp never goes above yellow on the model's word
alone, and the person can switch it off.

## Consequences

- Good: catches drift counters miss; nothing goes to us.
- Bad / cost: the last 3 messages, the last reply and 12 shell commands (secrets masked) go to the
  model; some usage of the person's plan (RK-3).
- Confirmation: mod test "drift check: yellow with the reason, never red"; README and the plugin
  README list the send.

## Evidence

- Mod test "drift check: yellow with the reason, never red"; the call is `$.model.complete({ model: 'haiku', maxTokens: 150, timeoutMs: 30000 })` in `src/register.js`.
- The README and the plugin README list the send and the switch (2026-11-09 onwards).

## Owner decision

Decision in force since 2026-11-09 (source: the owner's brief for helps 0.6.0, 2026-11-09, which
included the drift check). Recorded afterwards on 2026-11-21. Accepted by the Product Owner on 2026-11-21 with a button ("accept all six", translated), in the
session that prepares helps 1.0.0.
