---
id: ADR-0004
title: Install through Claude Code; the official directory for end users
status: accepted
date: 2026-11-21
deciders: Product Owner
owner-level: yes
supersedes: ~
superseded_by: ~
---

# ADR-0004: Install through Claude Code; the official directory for end users

Owner-level: yes (publication and distribution) · Decision-makers: Product Owner (accepts), lead (proposes)

## Context and problem

helps reached users in two ways: the Claude Code marketplace (this repository) and plugins added on
claude.ai (**Customize → Plugins**), synced into local sessions. On 2026-11-14 it was found that the
synced copy arrives without `hooks/`, so the mod does not load, and that it hides the installed
copy: no lamp at all (RK-2). The owner asked for a solution "simple and clear for the end user,
without workarounds". Serves FR-20, O-1, O-5.

## Options considered

1. **One channel now — install through Claude Code; the official plugin directory for end users
   after review.** Customize is not supported until the listing.
2. **Keep both channels** and document how to fix the synced copy — a workaround for every user.
3. **Ship without the mod** so the synced copy works — no lamp, the core of the product lost.

## Decision

Option 1. The README offers one install line; a warning tells users not to add helps on claude.ai
until the listing; the plugin carries what the directory asks (icon, licence, README of its own).

## Consequences

- Good: users who follow the README get the lamp; one path to support.
- Bad / cost: users of the claude.ai plugin list must use Claude Code to install; the listing
  depends on Anthropic's review (RK-6).
- Confirmation: AC-10 after the listing.

## Evidence

- 2026-11-14: on the owner's machine, the desktop app started sessions with `--plugin-dir` pointing at a synced copy of helps without `hooks/`; `/reload-plugins` showed 0 hooks; the lamp was missing.
- Claude Code documentation on synced plugins (loading, "synced plugins"), read 2026-11-14, says the opposite; reported through `/feedback` by the owner.
- `claude plugin validate` notes that the directory applies its own rules to hooks modules.

## Owner decision

Decision in force since 2026-11-14 (source: the owner's brief of 2026-11-14 — "a solution that is
simple and clear for the end user, without workarounds" — and his choice "Yes, prepare it" (translated) for the
directory). Recorded afterwards on 2026-11-21. Accepted by the Product Owner on 2026-11-21 with a button ("accept all six", translated), in the
session that prepares helps 1.0.0.
