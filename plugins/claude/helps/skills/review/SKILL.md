---
name: review
description: Once a week, go through what was saved for later — what to drop, what to keep, what to make the main thing. Use on "let's look at what's saved", "what do I have for later", "go through the ideas", and when the person agreed to a review.
---

# Review what was saved for later

```bash
helps ideas --json
```

Ask questions only through the pop-up with buttons, the AskUserQuestion tool (2–4 options, short labels, the recommended one first and marked as recommended). Do not write the options as chat text.

Show the saved items 4 at a time. For each, a question with the options:
"Keep", "Drop", "Make it the main thing".

- "Drop": `helps ideas --drop <n>` — numbers shift, so drop from the end of the list or fetch the list again.
- "Make it the main thing": ask whether they really want to change the main thing, then use the focus skill.

At the end, mark the review and sum up in one line:

```bash
helps reviewed
```

Here `helps …` is not a terminal command: call the `mcp__helps__run` tool with everything after the word helps in `args`, word by word, for example `{"args": ["idea", "<gist>", "--by", "claude"]}`. If there is no such tool (plain claude.ai chat or the phone), do not pretend you saved anything. Say in one sentence that the assistant keeps the main thing and the notes on the computer and fully works in Claude Code, and help with words here.
