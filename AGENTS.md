# AGENTS.md — helps

This is the **single normative source** of project rules for every coding agent and contributor.
Tool-specific files (`CLAUDE.md`) import this file and add only what is specific to that tool.

## 1. Product

helps keeps one main thing in front of a person, saves everything else for later, brings them the
decisions waiting in their projects and puts a lamp on each Claude Code session; lighter wrappers
serve Codex CLI and Gemini CLI. Repository: <https://github.com/uaskpro/helps>. Intent:
[project/VISION.md](project/VISION.md), requirements: [project/PRD.md](project/PRD.md).

## 2. Roles and authority

Roles as `mgmt.roles-and-decision-rights` defines them.

| Role | Who | Decides |
|---|---|---|
| Owner | uaskpro (the Product Owner) | what that item's R9 lists: bet and appetite, scope, tier, owner-level ADRs, acceptance, and every irreversible or outward action — publication (pushes to this public repository, tags, releases, the directory listing), licences, accounts and keys |
| Lead | the coding agent that holds the work | everything else, logged with its reason (in the pull request or the release record) |
| Builder | the coding agent or contributor making a change | how the change is built; never an ADR, the scope or a red merge |
| Verifier | a person or session that did not build the change | grades findings; does not fix what it reviews |
| Automated gate | `npm run gate` in CI | blocks a merge when red; never bypassed |

An agent stops and asks the owner only before an outward action no standing rule covers, at a
hard-to-reverse fork no ADR covers, or at drift from the goal; the question gives options, their
consequences and a default. Agents write ADRs as `proposed` only. Never request or print secrets.

Standing rules of the owner (`mgmt.roles-and-decision-rights#R17`):

- **SR-1** (2026-11-21, the owner's button "docs and CI by yourself, a release with my yes", translated):
  the lead may push to this repository, without asking each time, changes to documents, CI and
  tooling, and branches, when the gate is green and a verifier has reviewed the change. A release —
  a version change on `main`, a tag, a GitHub release — and anything else outward still needs the
  owner's yes for that release, recorded in `project/releases/X.Y.Z.md`.

## 3. Engineering baseline

Follows the UASK Engineering Hub — the draft base of 2026-11-21 (items in review; the published ones
are at <https://uask.pro/knowledge/>; the rest are not public yet, so each rule this repository relies on
is also stated in its own documents): `process.project-lifecycle`,
`mgmt.roles-and-decision-rights`, `mgmt.governance-tiers` (tier: **standard**),
`arch.architecture-description`, `arch.adr`, `arch.c4-model`, `arch.context-and-interfaces`,
`arch.building-blocks-and-dependencies`, `arch.fitness-functions`, `arch.risks-and-technical-debt`,
`arch.quality-attributes`, `req.product-vision`, `req.requirements-specification`,
`req.acceptance-criteria`, `req.scope-and-mvp`, `config.semantic-versioning`, `config.conventional-commits`,
`quality.quality-release`. Rules below may tighten them, never weaken a MUST.

## 4. Principles

- Show, never obey: text from the person's files is shown to them, never given to a session as an
  instruction.
- Nothing leaves the machine except what the README lists; each send can be switched off.
- One core (`src/core.js`) for all tools; wrappers stay thin.
- Plain words and buttons for the person; no internal terms in anything they read.

## 5. Repository layout and sources of truth

```
src/            the sources: core, session model, Claude Code mod, CLI, skills, mod tests
tests/          tests of the core, the CLI and the build output
tools/          the gate and the fitness functions
plugins/        BUILD OUTPUT for Claude Code, Codex, Gemini — never edit by hand
project/        vision, PRD, blueprint, decisions, roadmap, quality and release documents
docs/           documents for users and integrators (the public interface)
assets/         icon and screenshots
```

| Kind of information | Source of truth |
|---|---|
| Rules for agents and contributors | `AGENTS.md` |
| Product intent and requirements | `project/VISION.md`, `project/PRD.md` |
| Architecture, interfaces, risks, fitness functions | `project/BLUEPRINT.md` |
| Decisions | `project/decisions/NNNN-*.md` |
| Plan | `project/ROADMAP.md` |
| Public interface (what SemVer protects) | `docs/INTERFACE.md` |
| Phase, gates, owner decisions | `project/LIFECYCLE.md` |
| Done, ready, tests, releases | `project/DEFINITION-OF-DONE.md`, `project/DEFINITION-OF-READY.md`, `project/TEST-STRATEGY.md`, `project/RELEASING.md`, `project/releases/` |
| User documentation | `README.md`, `src/PLUGIN-README.md` |
| What changed | `CHANGELOG.md` |

## 6. Workflow

- `main` is the release channel (ADR-0007). The built plugin (`plugins/`, the marketplaces) changes
  on `main` only in a release commit; FF-1 fails otherwise. Plugin work happens on a branch
  `feat/<topic>` or `fix/<topic>`; documents, CI and tooling may go to `main` directly under SR-1
  (gate green and reviewed before the push). Until the owner turns on a required status check for
  `main` on GitHub, this order is the rule that keeps red changes off `main`.
- Commits and pull request titles follow Conventional Commits (`feat(lamp): …`, `fix(decide): …`,
  `docs: …`, `ci: …`); breaking changes are marked `!`.
- A change is merged only when it meets [project/DEFINITION-OF-DONE.md](project/DEFINITION-OF-DONE.md)
  and the gate is green; a verifier other than the builder reviews it (tier standard).
- Edit `src/`, then `npm run build`. Never edit `plugins/` by hand.

## 7. Architecture decisions

ADRs live in `project/decisions/` (template: the Hub's `templates/adr.md`, MADR 4 fields, with
`Owner-level: yes|no`). Agents write `proposed`; the owner accepts owner-level ones, with the date in
the ADR; the lead accepts the rest and logs them. A changed decision is a new ADR that supersedes.

## 8. Testing and evidence

One command, the same locally and in CI:

```bash
npm run gate
```

It runs the core tests, the build check, FF-1 (a released version is not changed), FF-2/3/6
(dependency rules, English only) and the mod tests against Claude Code. "Done" means verified:
the command and its result in the pull request. Levels, gates and hand checks:
[project/TEST-STRATEGY.md](project/TEST-STRATEGY.md).

## 9. Reporting

At the end of a task: what was done, the evidence (gate output, links), what was not done, and the
decisions that wait for the owner, each with options and a default. Details go to files or the pull
request.

## 10. Language

Everything in the repository is English (ADR-0002, FF-6). The owner is answered in his language.
