---
name: idea
description: Save for later an idea or task that pulls away from the main thing, without starting it. Use when the person suggests something new ("let's also…") unrelated to the main thing, or asks to "note it", "for later", "don't forget".
---

# Save for later

1. The gist in one line: what and why, no plan.
2. Save it (do not show the command to the person):

   ```bash
   helps idea "<gist>" --by claude
   ```

3. Say "Saved for later: <gist>" and ask a question with two options:
   "Back to <main thing>" and "This matters more, do it now".
   Ask questions only through the pop-up with buttons, the AskUserQuestion tool (2–4 options, short labels, the recommended one first and marked as recommended). Do not write the options as chat text.
   - "Back" — carry on with the main thing.
   - "Do it now" — do it without arguing, it is the person's call. If they say it is now the main thing, use the focus skill.

Without that question, do not start work on what was saved: no files, folders, repositories or sessions for it.

Here `helps …` is not a terminal command: call the `mcp__helps__run` tool with everything after the word helps in `args`, word by word, for example `{"args": ["idea", "<gist>", "--by", "claude"]}`. If there is no such tool (plain claude.ai chat or the phone), do not pretend you saved anything. Say in one sentence that the assistant keeps the main thing and the notes on the computer and fully works in Claude Code, and help with words here.
