<!-- The release checklist of the UASK Engineering Hub (templates/release-checklist.md, 2026-11-21), kept here so that contributors do not need the Hub. Copy to project/releases/X.Y.Z.md. -->
# Release vX.Y.Z — [project]

Type: regular / hotfix · Prepared by: [name or agent] · Approver: [name] · Planned window: [YYYY-MM-DD HH:MM–HH:MM TZ]

## 1. Scope

- Version: `vX.Y.Z` (previous: `vA.B.C`), class: MAJOR / MINOR / PATCH — why: [one line]
- Changelog entry: [link to the CHANGELOG.md section] [hotfix: shortened — one line is enough]
- Breaking changes and upgrade steps: [none / list]
- Stored data changes (migrations, imports, settings): [none / list] — reversible? [yes / no]

## 2. Readiness

- [ ] Main is green at commit `<sha>`; the tag will point to it.
- [ ] Artefacts built by CI from the released commit (`<job link>`); checksums recorded below.
- [ ] Staging verification done; results: [link or summary]. [hotfix: shortened — affected path plus critical paths]
- [ ] Acceptance by owner or users: [who, when]. [hotfix: shortened — owner confirms the fix]
- [ ] Dependency audit run (`<command>`); no known exploited vulnerabilities, or exception: [link].
- [ ] Documentation and changelog updated.

| Artefact | SHA-256 |
|---|---|
| `<file>` | `<checksum>` |

## 3. Deploy plan

- Window: [time] — chosen from: [traffic or load data]. [hotfix: shortened — as soon as approved]
- Who deploys: [name or agent] · who can roll back during the window: [name]
- Steps:
  1. [maintenance mode, if any]
  2. [deploy command or procedure]
  3. [migrations, cache clear]
  4. [leave maintenance mode]
- Expected duration: [minutes] · Users informed: [how, if needed]

## 4. Backup (before deploy)

- What: [files / database / configuration]
- Where: [location] · Taken at: [time] · Size checked: [size, compared with previous]
- Restore command or procedure: [how]

## 5. Rollback plan

- Triggers — roll back if any is true during verification:
  - [for example: a critical path fails]
  - [for example: error rate above X % for Y minutes; any fatal error in the log]
- Steps: [redeploy vA.B.C artefact; restore data from section 4 if the data change is not reversible]
- Expected time: [minutes] · Decides: [approver]

## 6. Approval

- [ ] Approved against this checklist by [name] on [YYYY-MM-DD HH:MM]. A green pipeline alone is not approval.

## 7. Deploy log

- Started: [time] · Finished: [time]
- Deviations from the plan: [none / list]

## 8. Post-release verification

| Critical path (from the test strategy) | Result |
|---|---|
| [path] | pass / fail |

- [ ] Error logs read: [findings]
- [ ] Monitoring watched for [observation period]: [findings]

## 9. Outcome

- Result: verified / rolled back / fixed forward by hotfix `<version>`
- Follow-up issues: [links] · Regression tests added: [links]
- Hotfix only: fix landed on main in [pull request link].
- Record kept at: [this file / release page]
