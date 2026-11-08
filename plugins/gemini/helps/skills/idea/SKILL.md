---
name: idea
description: Save for later an idea or task that pulls away from the main thing, without starting it. Use when the person suggests something new ("let's also…") unrelated to the main thing, or asks to "note it", "for later", "don't forget".
---

# Save for later

1. The gist in one line: what and why, no plan.
2. Save it (do not show the command to the person):

   ```bash
   helps idea "<gist>" --by gemini
   ```

3. Say "Saved for later: <gist>" and ask a question with two options:
   "Back to <main thing>" and "This matters more, do it now".
   Ask questions through your built-in choice dialog if you have one (for example ask_user); otherwise as a short numbered list, "reply with a number".
   - "Back" — carry on with the main thing.
   - "Do it now" — do it without arguing, it is the person's call. If they say it is now the main thing, use the focus skill.

Without that question, do not start work on what was saved: no files, folders, repositories or sessions for it.

If there is no `helps` command on PATH, call the core by the path given in the `[helps]` block at the start of the session: `node "<path>/cli.mjs" …`, or run `node "<path>/cli.mjs" link` once.
