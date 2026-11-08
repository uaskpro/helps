---
name: setup
description: Set up the helps assistant in a minute — pick one main thing and what "done" means. Use when the person agrees to set it up, asks to "set up helps" or "set up the assistant", or when helps is not set up yet and they want to get their work in order.
---

# One-minute setup

The person is not a programmer and does not need to know how this works. Plain words, no commands or paths.
{{ASK}}

1. See what is on the machine (do not show this to the person):

   ```bash
   {{HELPS}} scan
   {{HELPS}} status
   ```

2. Ask "What is the main thing now — what do we bring to a result first?". Options: the 3 projects from `scan` changed most recently (label: name and "changed N days ago"), and "Something else". On "Something else", ask them to name it in a word or two.

3. Ask "When do we call it done?". Options that fit the project, for example:
   "First sale", "Site is live", "Client accepted the work", "My own". Done is an event in the world, not "finish the code". On "My own", ask for one sentence.

4. Ask "What may be done right away, without saving it for later?". Options:
   "Urgent client work, outages, security (recommended)", "Nothing, only the main thing", "My own".

5. Save it (decision sources come from every project that has a state file):

   ```bash
   {{HELPS}} setup --project "<project>" --finish "<done>" --allow "<allowed right away>" --sources-from-scan
   ```

6. Sum up in three lines:
   - "Main thing now: <project>. Done when <…>."
   - "Everything else I will save for later and come back to the main thing. If you say 'this matters more', I will do it right away."
   - "Waiting for your decision: N" — if N > 0, offer "Go through them now (about 3 min)" / "Later".
{{FALLBACK}}
