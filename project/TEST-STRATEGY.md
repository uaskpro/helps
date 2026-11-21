# Test strategy and quality gates — helps

Version: 0.1.0 · Owner: lead · Last changed: 2026-11-21

## 1. Quality goals

The ranked goals QG-1 – QG-5 of [BLUEPRINT.md](BLUEPRINT.md) §1.

| Characteristic | Why it matters here | How we check it |
|---|---|---|
| security | helps reads the person's files and may write into them | mod and core tests for NFR-1, NFR-2, FR-11; review against the Definition of Done |
| reliability | it runs inside every session | tests for broken data and tool errors; TD-2 open |
| interaction capability | the lamp must be read in a glance | band tests for every layout and size; hand check in the terminal and the desktop app |
| compatibility | three OSes, two Node versions, three agent tools | CI matrix; format tests for Codex and Gemini; hand check per release |
| maintainability | a version is one content; rules have checks | FF-1 – FF-6 |

## 2. Test levels

| Level | Covers | Tools | Runs | Gate |
|---|---|---|---|---|
| Component (unit) | core functions, the session model, command reading, version comparison | `node:test` (`tests/core.test.mjs`) | local, every push, 6 CI jobs | G1 |
| Component integration | the CLI on a real file system; the build output; manifests | `node:test` | every push | G1 |
| System | the mod in the Claude Code engine: events, tool, band, Pause, drift, update notice | `claude plugin test` (`src/mod.test.ts`), Claude Code 2.1.321 | every push, Linux + Node 22 | G1 |
| System integration | a real Claude Code session with the plugin; Codex CLI and Gemini CLI | by hand (section 6) | release candidate | G2 |
| Acceptance | AC-1 – AC-12 of the PRD | tests + hand checks + the owner | release candidate | G2 |

Static checks: `claude plugin validate`, FF-1, FF-2, FF-3, FF-6 (`tools/fitness.mjs`, each with a self-test),
FF-5 (`build.mjs --check`) — G1. Two core tests that check Unix file permissions are skipped on Windows.
Regression: every gate reruns the whole suite; every escaped defect adds a test at the lowest level
that reproduces it.

## 3. Quality gates

| Gate | When | Checks | Command | Blocks |
|---|---|---|---|---|
| G1 Change | every push and pull request, locally and in CI | everything in section 2 that is automated, FF-1 – FF-6 | `npm run gate` | merge |
| G2 Release candidate | before release approval | G1 on the release commit; section 6 by hand; acceptance of the owner | `npm run gate` + the release checklist | the tag |
| G3 Post-release | right after the tag | the release workflow green; install of the new version from the marketplace into a clean configuration; the lamp appears | release checklist §8 | closing the release; triggers rollback |

Merging is blocked by a required status check on `main` (owner setting on GitHub; until it is set,
by the written rule in AGENTS.md §6).

## 4. Pipeline

1. Push or pull request → GitHub Actions run G1 on ubuntu, macos, windows × Node 18, 22.
2. Release branch with the version, CHANGELOG and `project/releases/X.Y.Z.md`; the owner's approval
   in the record; a pull request into `main` runs G1 with FF-7.
3. The owner merges → the release workflow reruns the gate, builds the three archives from the merge
   commit, records SHA-256 checksums, tags `vX.Y.Z` and creates the GitHub release.
4. G3 by the lead; the record is completed in `project/releases/X.Y.Z.md`.

## 5. Environments

| Environment | Purpose | Data | How it is refreshed |
|---|---|---|---|
| Local | development, G1 | fixtures in tests; a temporary `HELPS_DATA` | — |
| CI | G1 | fixtures | each run |
| Clean configuration (stand-in for staging) | G2, G3 | a temporary `CLAUDE_CONFIG_DIR` and `HELPS_DATA` with two demo projects | each release |
| Production | the person's computer | real | — |

## 6. Critical user paths

| Path | Check | Automated? |
|---|---|---|
| Install from the marketplace → new session → band visible | clean configuration, terminal: `/plugin install helps --marketplace uaskpro/helps`, new session, the band shows | no (G2, G3) |
| Setup → main thing saved → green lamp | AC-1 | partly (core tests "setup, scan and sources", "set up: the main thing and the way out") |
| New unrelated work → saved for later + two buttons | AC-2 | yes |
| Decision → button → one line in STATE.md | AC-6 | yes |
| Outside action in an own turn → yellow | AC-4 | yes |
| Desktop app → band visible | the owner opens a session in the desktop app | no (G2, owner) |
| Codex CLI and Gemini CLI → main thing in context | AC-9 | no (G2) |

## 7. Test data and secrets

Tests use fixtures and temporary folders; no real projects, no personal data. CI holds no secrets:
the release workflow uses only the job's own `GITHUB_TOKEN`.

## 8. Flaky and disabled checks

A failing check is fixed or quarantined in its own reviewed change with an issue.

| Check | Issue | Disabled since | Returns by |
|---|---|---|---|
| — | — | — | — |
