---
name: decide
description: Go through the decisions that wait for the person in their projects, one at a time, with buttons. Use on "go through decisions", "what is waiting for me", "inbox", "what questions are on me", and when the person agreed to go through them.
---

# Decisions, one at a time

Here `helps …` is not a terminal command. Call the `mcp__helps__run` tool with everything after the word helps in `args`, word by word: `helps idea "<gist>" --by claude` is `{"args": ["idea", "<gist>", "--by", "claude"]}`.

Get the list (do not show commands or paths to the person):

```bash
helps decisions --json
```

Ask questions only through the pop-up with buttons, the AskUserQuestion tool (2–4 options, short labels, the recommended one first and marked as recommended). Do not write the options as chat text.

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

If there is no `mcp__helps__run` tool (plain claude.ai chat or the phone), do not pretend you saved anything. Say in one sentence that the assistant keeps the main thing and the notes on the computer and fully works in Claude Code, and help with words here.
