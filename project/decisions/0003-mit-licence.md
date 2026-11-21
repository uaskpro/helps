---
id: ADR-0003
title: MIT licence
status: proposed
date: 2026-11-21
deciders: Product Owner
owner-level: yes
supersedes: ~
superseded_by: ~
---

# ADR-0003: MIT licence

Owner-level: yes (licences) · Decision-makers: Product Owner (accepts), lead (proposes)

## Context and problem

Until 0.99.2 the repository had no licence (all rights reserved), which blocks a public release and
the plugin directory. Serves NFR-11, O-5.

## Options considered

1. **MIT** — permissive, the common choice for editor and agent plugins.
2. **Apache-2.0** — permissive with a patent grant; longer.
3. **AGPL-3.0** — copyleft; keeps forks open, deters some users.
4. **Keep no licence** — no public release.

## Decision

Option 1, MIT (`LICENSE`, `package.json`, `plugin.json`).

## Consequences

- Good: no barrier for users or for the directory; simple notice.
- Bad / cost: anyone may reuse the code in closed products.
- Confirmation: `claude plugin validate` reads the licence field; review at each release.

## Owner decision

Decision in force since 2026-11-14 (source: the owner's choice of MIT with a button,
2026-11-14; released in 0.99.3). Recorded afterwards on 2026-11-21; awaiting the owner's
confirmation of this record.
