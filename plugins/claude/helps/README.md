# helps

An assistant for Claude Code. It keeps one main thing in front of you, saves everything else for
later, goes through the decisions waiting in your projects with you, and puts a lamp above the
prompt of every session that shows how that session is doing: green on track, yellow starting to
drift, red going the wrong way. It asks with pop-up buttons and talks in plain words.

## Install

In Claude Code, one line in the prompt:

```text
/plugin install helps --marketplace uaskpro/helps
```

Full documentation: https://github.com/uaskpro/helps

## What it runs, sends, fetches and writes

- **Runs** only inside Claude Code: a mod (`hooks/register.js`, with `core.js` and `session.js`)
  and five skills. No other programs, no background services.
- **Reads** its own data folder `~/helps-data` (`HELPS_DATA` moves it), and the Markdown state
  files of your projects that you listed during setup. Text from those files is shown to you and
  never becomes an instruction to Claude.
- **Writes** only its own data folder, and an answer to a decision (one line) into the state file
  that asked it, and only after you picked the answer with buttons.
- **Sends** one thing: every few turns, your last three messages, the session's last reply and
  its last twelve shell commands (passwords and tokens masked) go to a small Claude model through
  your own Claude Code account, to check that the session still does what you asked. Off with
  `"session": {"drift_check": false}` in `~/helps-data/config.json`.
- **Fetches** helps' own version number from `raw.githubusercontent.com/uaskpro/helps` at most once
  every six hours, to tell you about updates. Nothing about you is sent. Off with
  `"session": {"update_check": false}`, and off when `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`
  is set.
- Nothing is sent or fetched while no lamp is visible (scripts, cloud sessions).

## License

MIT
