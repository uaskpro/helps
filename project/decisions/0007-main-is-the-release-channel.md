---
id: ADR-0007
title: main is the release channel
status: accepted
date: 2026-11-21
deciders: lead
owner-level: no
supersedes: ~
superseded_by: ~
---

# ADR-0007: `main` is the release channel

Owner-level: no · Decision-makers: lead (decides and logs, `mgmt.roles-and-decision-rights#R10`)

## Context and problem

The Claude Code marketplace in this repository serves the plugin from `main`. Until 0.99.3 every
push raised the version, without tags, so the code a user got under a version could change before
the next bump, and no earlier version could be installed again. Serves NFR-12.

## Options considered

1. **`main` is the release channel**: the built plugin (`plugins/`, the marketplaces) changes on
   `main` only in a release commit with a new version, a changelog entry, a release record and a
   tag. Work on plugin code happens on branches; documents and CI may change on `main` at any time.
2. **A separate `release` branch** as the marketplace — users would add a branch-specific
   marketplace; the directory listing points at a path on the default branch.
3. **Keep a version bump per push** — no stable versions.

## Decision

Option 1. FF-1 in the gate fails when `plugins/` differs from the tag of the current version.

## Consequences

- Good: a version means one content; any released version can be reinstalled from its tag.
- Bad / cost: plugin changes wait on a branch until a release.
- Confirmation: FF-1 (`tools/gate.mjs`).
- Follow-up: TD-1 (the version check reads `main`) is harmless while this holds.

## Owner decision

Not owner-level. Accepted by the lead on 2026-11-21 and logged in the release record of 1.0.0.
