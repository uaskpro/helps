---
id: ADR-0008
title: helps asks the decision itself
status: accepted
date: 2026-11-21
deciders: Product Owner
owner-level: yes
supersedes: ~
superseded_by: ~
---

# ADR-0008: helps asks the decision itself

Owner-level: yes (who may answer in the person's name) · Decision-makers: Product Owner (accepts), lead (proposes)

## Context and problem

In 1.0.0 a button answer to any question let a session write any answer to any decision for 30
minutes. The first fix tied a button answer to a decision id written into the question — but the
session writes the question and knows every id, so it could ask "Take a break? (id …)" and get "Yes"
written into another decision (adversarial review, 2026-11-21). Serves FR-11, QG-1.

## Options considered

1. **helps asks the person itself** (`helps ask <id> --option …`): helps shows the project's own question
   in its own dialog and writes exactly what the person picks or types.
2. **Ask again for every answer**: the session asks, then helps asks "write this?" — two clicks per answer.
3. **Keep grants, require the decision's text in the question** — the session retells questions in plain
   words, so the text rarely matches; and a session can still copy it into a misleading question.

## Decision

Option 1. The person answers once, in a dialog whose question the session cannot word, and only their
own choice is written. A direct `helps answer` still works, through helps' confirmation dialog.

## Consequences

- Good: in Claude Code no session can answer in the person's name through helps; one click per
  answer. A session that edits the project's file itself, or runs the `helps` command in Bash, goes
  around helps; no plugin can prevent that.
- Bad / cost: the question shows the project's wording, not a plainer retelling; one to three options.
  Outside Claude Code there is no dialog (PRD C-1, RK-11).
- Confirmation: mod tests "helps asks the project's own question and writes only what the person
  picks", "an answer goes into a project only with your hand on it".

## Evidence

- Adversarial review of 1.0.1, 2026-11-21 (finding H2), with a working example.

## Owner decision

Accepted by the Product Owner on 2026-11-21 with a button ("helps asks the question itself", translated).
