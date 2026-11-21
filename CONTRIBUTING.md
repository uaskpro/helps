# Contributing

Thank you for helping. Bugs and ideas: open an issue with one of the templates. Security
problems: see [SECURITY.md](SECURITY.md), not an issue.

## Before a pull request

1. Read [AGENTS.md](AGENTS.md): the rules of this repository, for people and coding agents alike.
2. Edit `src/`, never `plugins/` (build output): `npm run build`.
3. Run the gate; it is the same script CI runs:

   ```bash
   npm run gate
   ```

   It needs Node 18 or newer and Claude Code (`claude`) for the mod tests.
4. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):
   `fix(lamp): …`, `feat(decide): …`, `docs: …`.
5. A user-visible change gets a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md).

A change to the public interface ([docs/INTERFACE.md](docs/INTERFACE.md)) needs an issue first:
it decides the next version number.
