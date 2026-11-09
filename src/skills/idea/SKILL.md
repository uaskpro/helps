---
name: idea
description: Save for later an idea or task that pulls away from the main thing, without starting it. Use when the person suggests something new ("let's also…") unrelated to the main thing, or asks to "note it", "for later", "don't forget".
---

# Save for later
{{INTRO}}

1. The gist in one line: what and why, no plan.
2. Save it (do not show the command to the person):

   ```bash
   {{HELPS}} idea "<gist>" --by {{AGENT}}
   ```

3. Say "Saved for later: <gist>" and ask a question with two options:
   "Back to <main thing>" and "This matters more, do it now".
   {{ASK}}
   - "Back" — carry on with the main thing.
   - "Do it now" — do it without arguing, it is the person's call. If they say it is now the main thing, use the focus skill.

Without that question, do not start work on what was saved: no files, folders, repositories or sessions for it.
{{FALLBACK}}
