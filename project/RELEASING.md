# Releasing helps

How a version reaches users, and how to go back. Rules: `quality.quality-release`,
`config.semantic-versioning`, ADR-0007.

## Version number

`MAJOR.MINOR.PATCH` against the public interface in [docs/INTERFACE.md](../docs/INTERFACE.md):
MAJOR for a breaking change, MINOR for something new or a deprecation, PATCH for fixes only. In
doubt, MAJOR. A released version never changes; FF-1 enforces it.

## Steps

0. **Spec.** Class the work ([LIFECYCLE.md](LIFECYCLE.md)). A change or a system change gets a
   release spec `project/releases/X.Y.Z-spec.md` (`process.release-spec`), approved by the lead, or by
   the owner when it changes the scope or the appetite; a fix needs only the failing check, and the
   rollback, in its pull request.
1. **Branch.** Plugin work is merged into a branch `release/X.Y.Z`, not into `main`.
2. **Bump.** `version` in `package.json` and `VERSION` in `src/core.js`; `npm run build`.
3. **Changelog.** Move `Unreleased` to `## X.Y.Z` in `CHANGELOG.md`, written for users; mark
   **Breaking**, **Deprecated**, **Security**; for a MAJOR, the upgrade steps.
4. **Record.** Copy [releases/TEMPLATE.md](releases/TEMPLATE.md) to `project/releases/X.Y.Z.md` and
   fill sections 1–5 before anything is published.
5. **Gate.** `npm run gate` green on the release commit; the Q2 hand checks of
   [TEST-STRATEGY.md](TEST-STRATEGY.md) §6 done and recorded.
6. **Approval.** The owner approves against the record (section 6 of it, the line
   `- [x] Approved …`), with the date. A green pipeline alone is not an approval: FF-7 keeps an
   untagged version off `main` without that line.
7. **Publish.** Open a pull request from `release/X.Y.Z` into `main`; the owner merges it. On the merge
   the release workflow reruns the gate, builds the archives and checksums from that commit, tags it
   `vX.Y.Z` and creates the GitHub release. Copy the checksums into the record in the next documents
   change. Agents do not push to `main` or push tags.
8. **Verify (Q3).** Clean configuration: install from the marketplace, new session, the band shows,
   `helps doctor` prints X.Y.Z. Record the result and close the record.

A hotfix is the smallest change that removes the defect, as a PATCH, with a regression test, through
the same steps; checklist lines marked as shortened for hotfixes may be shortened.

## Rollback

Trigger: the band does not show, a session breaks, or helps writes or sends something the README
does not list. Decides: the owner (the lead may roll back at once if a session breaks, and reports).

- **For everyone:** release the previous content as a new PATCH (revert on a branch, bump, release).
  A tag is never moved or reused.
- **For one machine, at once** (about 5 minutes): remove the
  marketplace that follows `main` (it has the same name), then install the earlier tag from a
  local copy:

  ```bash
  git clone --branch vA.B.C https://github.com/uaskpro/helps ~/helps-vA.B.C
  ```

  ```bash
  claude plugin marketplace remove uaskpro-helps
  ```

  ```bash
  claude plugin marketplace add ~/helps-vA.B.C
  ```

  ```bash
  claude plugin install helps@uaskpro-helps
  ```

  Then `/reload-plugins` in running sessions. To follow releases again, remove this marketplace
  and add `uaskpro/helps` back. Tested on 2026-11-21 with v0.99.2 from a local checkout of the tag
  into a clean configuration (the clone from GitHub works once the tags are published).

  Data in `~/helps-data` is kept across versions; nothing to restore.

## Tags of earlier versions

`v0.5.0` … `v0.99.3` are listed in [releases/tags.txt](releases/tags.txt), each on the last commit
released under that version (the content users last had under that number); the release workflow
creates the tags on the first merge into `main` after 2026-11-21. They have no release records or
archives. GitHub refuses the workflow token a tag on a commit whose `.github/workflows/` differ from
the default branch (`v0.99.0` … `v0.99.3`); the workflow then prints, as a warning, the command a
person with write access runs once:

```bash
git tag vA.B.C <commit> && git push origin vA.B.C
```

## If the release workflow stops halfway

Run it again (Actions → release → Re-run all jobs). It looks for a GitHub release of the version,
not only for the tag, and creates the tag and the release only where they are missing.
