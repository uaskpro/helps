# Security policy

## Supported versions

Only the latest release of helps gets fixes. A security fix is released as a new PATCH version
and is marked **Security** in [CHANGELOG.md](CHANGELOG.md).

## Reporting a vulnerability

Please do not open a public issue. Report it privately on GitHub:
**Security → Report a vulnerability** in this repository
(<https://github.com/uaskpro/helps/security/advisories/new>).

Say what an attacker can do, the steps to reproduce it, and the helps version (`helps doctor` in a
session prints it). You will get an answer within seven days. When the fix is out, the advisory is
published with credit to you, unless you ask otherwise.

## What counts

helps reads and writes local files, and sends a short excerpt of the session to a Claude model for
the drift check ([README → Privacy and safety](README.md#privacy-and-safety)). Of interest are, for
example: text from a project file that becomes an instruction to a session; an answer written into
a project without the person choosing it; a write outside the data folder and the listed state
files; a secret that is not masked before the drift check; anything sent or fetched that the README
does not list.
