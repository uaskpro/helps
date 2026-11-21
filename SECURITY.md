# Security policy

## Supported versions

Only the latest release of helps gets fixes. A security fix is released as a new PATCH version
and is marked **Security** in [CHANGELOG.md](CHANGELOG.md).

## Reporting a vulnerability

Please do not open a public issue. Report it privately on GitHub:
**Security → Report a vulnerability** in this repository
(<https://github.com/uaskpro/helps/security/advisories/new>). If that form is not available, open an
issue that says only "security report: please contact me", with no details, and you will be given a
private way to send them.

Say what an attacker can do, the steps to reproduce it, and the helps version (`helps doctor` in a
session prints it). You will get an answer within seven days (the owner's commitment, 2026-11-21). When
the fix is out, the advisory is
published with credit to you, unless you ask otherwise.

## What counts

helps reads and writes local files, and sends a short excerpt of the session to a Claude model for
the drift check ([README → Privacy and safety](README.md#privacy-and-safety)). Of interest are, for
example: text from a project file that becomes an instruction to a session; an answer written into
a project in Claude Code without the person choosing it in helps' own dialog; a write outside the data folder and the listed state
files; a secret in a shell command that is not masked before the drift check (the person's own
messages are sent as written, as the README says); anything sent or fetched that the README
does not list. (`helps link`, which you run yourself, writes one command file into the folder you
name; that is expected.)
