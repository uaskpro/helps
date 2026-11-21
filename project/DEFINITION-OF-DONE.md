# Definition of Done — helps

Version: 0.1.0 · Owner: lead · Last changed: 2026-11-21

A change is done when every line below that applies to it is true. A line that does not apply is
marked "n/a" in the pull request with a reason. This file changes only through a reviewed change.

## Every change

- [ ] Linked to an issue or a release spec that states its acceptance criteria, or to a requirement
      id of [PRD.md](PRD.md).
- [ ] The acceptance criteria are met and the evidence is in the pull request (test, command output,
      screenshot).
- [ ] The gate is green locally and in CI: `npm run gate`.
- [ ] New or changed behaviour has a test at the lowest level that can catch its failure
      ([TEST-STRATEGY.md](TEST-STRATEGY.md)); a fixed defect has a regression test.
- [ ] Reviewed by someone other than the author (a person or a second agent session).
- [ ] The pull request title and commits follow Conventional Commits; breaking changes are marked.
- [ ] Documentation is updated: README, the plugin README, `docs/INTERFACE.md` for interface changes,
      the blueprint for architecture changes, and an ADR for a hard-to-reverse decision.
- [ ] `CHANGELOG.md` has a line under `Unreleased` if users will notice the change.
- [ ] No secrets, no debug leftovers, no new warnings in the build.
- [ ] No new runtime dependency (DR-3); a new dev tool has a compatible licence.

## This project only

- [ ] `plugins/` was changed only by `npm run build`, and on `main` only in a release (ADR-0007).
- [ ] A new send, fetch or write outside the data folder is listed in the README's
      "Privacy and safety", in the plugin README, and in the blueprint's interface inventory.
- [ ] A new question to the person is a pop-up with 2–4 buttons in plain words (NFR-7).
- [ ] No text read from the person's files reaches a session's instructions (NFR-1); a test shows it.
- [ ] Interface changes are classified compatible or breaking ([docs/INTERFACE.md](../docs/INTERFACE.md)).
