---
name: review
description: Once a week, go through what was saved for later — what to drop, what to keep, what to make the main thing. Use on "let's look at what's saved", "what do I have for later", "go through the ideas", and when the person agreed to a review.
---

# Review what was saved for later
{{INTRO}}

```bash
{{HELPS}} ideas --json
```

{{ASK}}

Show the saved items 4 at a time. For each, a question with the options:
"Keep", "Drop", "Make it the main thing".

- "Drop": `{{HELPS}} ideas --drop <n>` — numbers shift, so drop from the end of the list or fetch the list again.
- "Make it the main thing": ask whether they really want to change the main thing, then use the focus skill.

At the end, mark the review and sum up in one line:

```bash
{{HELPS}} reviewed
```
{{FALLBACK}}
