---
name: setup
description: Set up the helps assistant in a minute — pick one main thing and what "done" means. Use when the person agrees to set it up, asks to "set up helps" or "set up the assistant", or when helps is not set up yet and they want to get their work in order.
---

# One-minute setup

Here `helps …` is not a terminal command. Call the `mcp__helps__run` tool with everything after the word helps in `args`, word by word: `helps idea "<gist>" --by claude` is `{"args": ["idea", "<gist>", "--by", "claude"]}`.

Plain words, no commands or paths. Setup is three questions and one save, about a minute. Keep it that fast.
Ask questions only through the pop-up with buttons, the AskUserQuestion tool (2–4 options, short labels, the recommended one first and marked as recommended). Do not write the options as chat text.

1. See what is on the machine (do not show this to the person):

   ```bash
   helps scan
   helps status
   ```

   That is all the looking around: never search disks, shares or other machines yourself, and do not
   count or list files. `scan` already looked where this session runs and in the usual folders.

2. Ask "What is the main thing now — what do we bring to a result first?". Options: the 3 projects from `scan` changed most recently (label: name and "changed N days ago"); the dialog's own free-text option covers anything else. If `scan` found no projects, skip the options and just ask them to name it in a word or two.

3. Ask "When do we call it done?". Options that fit the project, for example:
   "First sale", "Site is live", "Client accepted the work". Done is an event in the world, not "finish the code".

4. Ask "What may be done right away, without saving it for later?". Options:
   "Urgent client work, outages, security" (recommended), "Nothing, only the main thing".

5. Save it: the meaning of each answer in plain words, without option marks such as "(recommended)". Decision sources come from every project that has a state file:

   ```bash
   helps setup --project "<project>" --finish "<done>" --allow "<allowed right away>" --sources-from-scan
   ```

6. Sum up in three lines:
   - "Main thing now: <project>. Done when <…>."
   - "Everything else I will save for later and come back to the main thing. If you say 'this matters more', I will do it right away."
   - "Waiting for your decision: N" — if N > 0, offer "Go through them now (about 3 min)" / "Later".

If there is no `mcp__helps__run` tool (plain claude.ai chat or the phone), do not pretend you saved anything. Say in one sentence that the assistant keeps the main thing and the notes on the computer and fully works in Claude Code, and help with words here.
