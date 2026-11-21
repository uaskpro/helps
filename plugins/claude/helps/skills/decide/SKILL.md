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
1. Pick the options: the ones the project itself suggests, the one it recommends first; if the text has none,
   "Yes" and "No". One to three options; helps adds "Skip", and the person may type their own answer.
2. Let helps ask the person; it shows the project's own question and writes the option they pick:

   ```bash
   helps ask <id> --option "<first option>" --option "<second option>"
   ```

   Do not ask the question yourself and do not call `helps answer`: helps would ask the person again.
3. If a question is stale (the project file is older than 7 days), say so before asking.

At the end: "Went through N, M left". Do not decide for the person and do not add questions of your own.
Write only answers the person gave: an answer goes into the project's file under their name.

If there is no `mcp__helps__run` tool (plain claude.ai chat or the phone), do not pretend you saved anything. Say in one sentence that the assistant keeps the main thing and the notes on the computer and fully works in Claude Code, and help with words here.
