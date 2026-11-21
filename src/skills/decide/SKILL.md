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

For each decision, at most 6 at a time:
1. Retell the project's question in one or two plain sentences, no jargon. Put the project in the title.
   End the question with the decision's id exactly as `(id <id>)`, for example `(id 2dfbe14c)`: it ties
   the person's answer to this decision.
2. Options are the ones the project itself suggests; the one the project recommends goes first, marked as recommended.
   If the text has no options: "Yes", "No". There is always "Skip"; "Later" means the same.
3. For the chosen option, write the answer down — the project will see it in its own file. On "Skip" or "Later" write nothing: the question stays open.
   Write exactly the option the person picked, or exactly what they typed; any other text is not their
   answer, and helps will ask them again.

   ```bash
   {{HELPS}} answer <id> "<the option they picked, word for word>"
   ```

4. If a question is stale (the project file is older than 7 days), say so and offer "Skip".

At the end: "Went through N, M left". Do not decide for the person and do not add questions of your own.
Write only answers the person gave: an answer goes into the project's file under their name.
{{FALLBACK}}
