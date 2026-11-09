---
name: decide
description: Go through the decisions that wait for the person in their projects, one at a time, with buttons. Use on "go through decisions", "what is waiting for me", "inbox", "what questions are on me", and when the person agreed to go through them.
---

# Decisions, one at a time

Get the list (do not show commands or paths to the person):

```bash
helps decisions --json
```

Ask questions through your built-in choice dialog if you have one (for example request_user_input); otherwise as a short numbered list, "reply with a number".

For each decision, at most 6 at a time:
1. Retell the project's question in one or two plain sentences, no jargon. Put the project in the title.
2. Options are the ones the project itself suggests; the one the project recommends goes first, marked as recommended.
   If the text has no options: "Yes", "No". There is always "Skip"; "Later" means the same.
3. For the chosen option, write the answer down — the project will see it in its own file. On "Skip" or "Later" write nothing: the question stays open.

   ```bash
   helps answer <id> "<the person's answer in plain words>"
   ```

4. If a question is stale (the project file is older than 7 days), say so and offer "Skip".

At the end: "Went through N, M left". Do not decide for the person and do not add questions of your own.
Write only answers the person gave: an answer goes into the project's file under their name.

If there is no `helps` command on PATH, call the core by the path given in the `[helps]` block at the start of the session: `node "<path>/cli.mjs" …`, or run `node "<path>/cli.mjs" link` once.
