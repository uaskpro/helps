---
name: focus
description: Show or change the person's main thing. Use on "what is the main thing now", "what are we working on", "let's make … the main thing", "change the main thing".
---

# The main thing

Find out (do not show the command to the person):

```bash
helps status
```

Answer in one line: "Main thing now: <project>, day N. Done when <…>."

Change it only if the person wants to. First confirm, and ask what "done" will mean.
Ask questions through your built-in choice dialog if you have one (for example request_user_input); otherwise as a short numbered list, "reply with a number".
Options for "done" that fit the work: "First sale", "Site is live", "Client accepted the work", "My own".

```bash
helps focus --set "<project>" --finish "<done>"
```

Save the previous main thing for later so it is not lost:

```bash
helps idea "Back to <previous project>: <where we stopped>" --by codex
```

If there is no `helps` command on PATH, call the core by the path given in the `[helps]` block at the start of the session: `node "<path>/cli.mjs" …`, or run `node "<path>/cli.mjs" link` once.
