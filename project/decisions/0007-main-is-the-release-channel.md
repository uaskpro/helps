---
id: ADR-0007
title: main is the release channel
status: accepted
date: 2026-11-21
deciders: Product Owner
owner-level: yes
supersedes: ~
superseded_by: ~
---

# ADR-0007: `main` is the release channel

Owner-level: yes (how and when users receive content) · Decision-makers: Product Owner (accepts), lead (proposes)

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

Option 1. It keeps one install path for users and for the directory (the default branch), makes a
version mean one content, and lets any released version be installed again from its tag, while plugin
work waits on a branch until a release.

## Consequences

- Good: a version means one content; any released version can be reinstalled from its tag.
- Bad / cost: plugin changes wait on a branch until a release.
- Confirmation: FF-1 and FF-7 (`tools/fitness.mjs`, run by the gate).
- Follow-up: TD-1 (the version check reads `main`) is harmless while this holds.
- How it runs (2026-11-21): `main` changes through pull requests the owner merges; on a merge the
  release workflow tags new approved versions and those listed in `project/releases/tags.txt`.

## Evidence

- Until 0.99.3 the version was raised with every push and no tag existed (git history, 2026-11-21).
- Reinstalling v0.99.2 from its tag into a clean configuration worked on 2026-11-21 (`claude plugin marketplace add` of a local checkout of the tag, then `claude plugin install helps@uaskpro-helps`).

## Owner decision

Proposed by the lead on 2026-11-21; first written as a lead-level decision, raised to owner-level by
the verifier's review. Accepted by the Product Owner on 2026-11-21 with a button ("Accept").
