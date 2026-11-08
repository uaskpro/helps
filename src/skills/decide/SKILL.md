---
name: decide
description: Go through the decisions that wait for the person in their projects, one at a time, with buttons. Use on "go through decisions", "what is waiting for me", "inbox", "what questions are on me", and when the person agreed to go through them.
---

# Decisions, one at a time

Get the list (do not show commands or paths to the person):

```bash
{{HELPS}} decisions --json
```

{{ASK}}

For each decision, at most 6 at a time:
1. Retell the project's question in one or two plain sentences, no jargon. Put the project in the title.
2. Options are the ones the project itself suggests; the one the project recommends goes first, marked as recommended.
   If the text has no options: "Yes", "No", "Postpone". There is always "Skip".
3. For the chosen option (except "Skip"), write the answer down — the project will see it in its own file:

   ```bash
   {{HELPS}} answer <id> "<the person's answer in plain words>"
   ```

4. If a question is stale (the project file is older than 7 days), say so and offer "Skip".

At the end: "Went through N, M left". Do not decide for the person and do not add questions of your own.
{{FALLBACK}}
