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
Ask questions only through the pop-up with buttons, the AskUserQuestion tool (2–4 options, short labels, the recommended one first and marked as recommended). Do not write the options as chat text.
Options for "done" that fit the work: "First sale", "Site is live", "Client accepted the work", "My own".

```bash
helps focus --set "<project>" --finish "<done>"
```

Save the previous main thing for later so it is not lost:

```bash
helps idea "Back to <previous project>: <where we stopped>" --by claude
```

Here `helps …` is not a terminal command: call the `mcp__helps__run` tool with everything after the word helps in `args`, word by word, for example `{"args": ["idea", "<gist>", "--by", "claude"]}`. If there is no such tool (plain claude.ai chat or the phone), do not pretend you saved anything. Say in one sentence that the assistant keeps the main thing and the notes on the computer and fully works in Claude Code, and help with words here.
