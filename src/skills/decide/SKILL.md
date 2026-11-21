---
name: decide
description: Go through the decisions that wait for the person in their projects, one at a time, with buttons. Use on "go through decisions", "what is waiting for me", "inbox", "what questions are on me", and when the person agreed to go through them.
---

# Decisions, one at a time
{{INTRO}}

Get the list (do not show commands or paths to the person):

```bash
{{HELPS}} decisions --json
```

{{ASK}}

{{DECIDE}}

At the end: "Went through N, M left". Do not decide for the person and do not add questions of your own.
Write only answers the person gave: an answer goes into the project's file under their name.
{{FALLBACK}}
