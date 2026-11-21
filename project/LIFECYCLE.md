# Lifecycle record — helps

Phases and gates as `process.project-lifecycle` defines them; owner decisions as
`mgmt.roles-and-decision-rights` R9, R13 (with the date and the owner's words; translated where the
owner wrote in another language).

## Current phase

**Support** of 1.0.0 (released 2026-11-21). A fix release 1.0.1 is prepared on `fix/1.0.1`
(class fix; findings of an outside review).

## Gates

| Gate | Date | Decided by | Decision |
|---|---|---|---|
| G0 Bet | 2026-11-08 | owner | helps is the main thing; done when "the lamp is visible in Claude's interface and changes colour" (helps setup, `since: 2026-11-08`) |
| G0 Tier | 2026-11-21 | owner | tier **standard** (button "Standard") |
| G0 Appetite | 2026-11-21 | owner | **2 agent-days** for release 1.0.0, foundation and review fixes included (button "2 agent-days"); the lead stops and asks at the limit |
| G1 Blueprint approved | 2026-11-21 | owner | VISION 0.2.0, PRD 0.2.0, BLUEPRINT 0.2.0 approved after two verifier reviews (button "Approve") |
| G2 Ready (1.0.0) | 2026-11-21 | lead | release spec `releases/1.0.0-spec.md` approved; Definition of Ready met |
| G3 Go-live (1.0.0) | 2026-11-21 | owner | release 1.0.0 approved against its record (button "Approve 1.0.0") |

## Gate checklist (every gate)

- [ ] Recall: earlier work that bears on this gate was searched (this file, the ADRs, the release
      records, the session memory) and is cited.
- [ ] Record: what the gate decided and learned is written here, in the ADRs or in the release record.

## Open items for the owner

- Turn on private vulnerability reporting: helps on GitHub → Settings → Security → Private
  vulnerability reporting (SECURITY.md; until then the fallback in SECURITY.md applies).
- Require the status check `gate` for `main`: Settings → Rules → a branch ruleset for `main` with
  "Require status checks to pass". Until then SR-1 is the rule that keeps red changes off `main`.
- Push the tags `v0.99.0` … `v0.99.3` once (GitHub refuses them to the workflow token): see
  RELEASING.md, "Tags of earlier versions".
- Approve release 1.0.1 and PRD/BLUEPRINT 0.3.0; merge the pull request `fix/1.0.1` → `main`.

## The owner's brief for this foundation run

2026-11-21 (translated): "Let us check our plugin against the base we are building now. Do it
yourself, by hand: is anything missing that makes our plugin a home-made craft? I would like to put
out a mature product that others understand." Then, with buttons: the tier "Standard", the plan
"All: 1 → 2 → 3" (quick fixes, foundation, 1.0.0).

Tailoring at tier standard: no staging environment (a clean Claude Code configuration stands in,
TEST-STRATEGY §5); the release checklist is the Hub's, kept in this repository
(`releases/TEMPLATE.md`).

## Owner decisions

| Date | Decision | Words (translated) | Where recorded |
|---|---|---|---|
| 2026-11-08 | no Python; English only in the repository | "no Python"; "only English, no traces of Russian" | ADR-0001, ADR-0002 |
| 2026-11-09 | the lamp shows this session; the drift check | the brief for helps 0.6.0 | ADR-0005, ADR-0006 |
| 2026-11-14 | MIT licence; one install channel and the official directory | button "MIT"; "simple and clear for the end user, without workarounds"; button "Yes, prepare it" | ADR-0003, ADR-0004 |
| 2026-11-21 | tier standard; plan 1 → 2 → 3; appetite 2 agent-days | buttons | this file |
| 2026-11-21 | ADR-0001 – ADR-0006 accepted | button "accept all six"; the question named each decision in one line; the reasons and evidence were written into the ADRs afterwards (commit 92c3ebd) without changing the decisions | each ADR |
| 2026-11-21 | ADR-0007 accepted | button "Accept" | ADR-0007 |
| 2026-11-21 | standing rule SR-1 (documents and CI by the lead; a release with the owner's yes) | button "docs and CI by yourself, a release with my yes" | AGENTS.md §2 |
| 2026-11-21 | publish the tags `v0.5.0` … `v0.99.3` | button "Yes, publish" | this file |
| 2026-11-21 | G1: VISION, PRD, BLUEPRINT approved; G3: release 1.0.0 approved | buttons "Approve", "Approve 1.0.0" | this file, the documents, `releases/1.0.0.md` |
| 2026-11-21 | release 1.0.1: fix the review's findings, appetite 1 agent-day | button "1.0.1: all fixes, 1 agent-day" | `releases/1.0.1.md` |
| 2026-11-21 | 1.0.1 after the adversarial review: helps asks the decision itself; exact locks where possible and the limit written down; +1 agent-day | buttons "helps asks the question itself", "exact where possible + honest limit", "+1 agent-day" | this file, ADR-0008 |
| 2026-11-21 | security reports through GitHub private reporting, answer within 7 days; the owner turns the setting on | button "GitHub, 7 days" | SECURITY.md |

## Change classes in Support

Every piece of work on a released version is classed when it arrives (`process.project-lifecycle`
R10): a **fix** goes straight to a branch and a PATCH; a **change** gets a short release spec
(`releases/X.Y.Z-spec.md`); a **system change** goes back to the blueprint. In doubt, the higher class.
