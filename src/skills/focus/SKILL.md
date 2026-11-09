---
name: focus
description: Show or change the person's main thing. Use on "what is the main thing now", "what are we working on", "let's make … the main thing", "change the main thing".
---

# The main thing
{{INTRO}}

Find out (do not show the command to the person):

```bash
{{HELPS}} status
```

Answer in one line: "Main thing now: <project>, day N. Done when <…>."

Change it only if the person wants to. First confirm, and ask what "done" will mean.
{{ASK}}
Options for "done" that fit the work: "First sale", "Site is live", "Client accepted the work".

```bash
{{HELPS}} focus --set "<project>" --finish "<done>"
```

Save the previous main thing for later so it is not lost:

```bash
{{HELPS}} idea "Back to <previous project>: <where we stopped>" --by {{AGENT}}
```
{{FALLBACK}}
