# claude-config — maintaining this repo

This repo is my global Claude Code setup. `home/CLAUDE.md` is what gets installed
as `~/.claude/CLAUDE.md`; **this** file is only about working on the repo itself.

- `home/` is installed into `~/.claude`; `.agents/skills/` holds vendored upstream
  skills, also installed (`.claude/skills/` only holds symlinks to them, so the
  skills load when working in this repo; Windows checks symlinks out as plain
  files, which is why the installer reads `.agents/skills/`). `install.sh` +
  `scripts/merge-settings.js` do the work.
- **Vendored skills stay byte-identical to upstream** (`skills-lock.json` tracks
  them; `npm run update-skills` refreshes them). Overrides go in
  `home/CLAUDE.md`. An edited vendored skill is silently overwritten on the next
  update.
- `home/CLAUDE.md` loads in every session of every project, so keep it short.
  The tests cap it at 200 lines and check that every skill it or the reminder
  names is shipped.
- The installer must never destroy the user's own settings, hooks, skills or
  CLAUDE.md, and a re-run must change nothing. `test/install.test.js` checks all
  three. Break the thing on purpose and watch the test fail before trusting a
  new test.
- `npm test` before every push; CI runs it on Linux, macOS and Windows.
- **The local clone (`~/claude-config`) stays on `main`.** The self-update
  (`scripts/self-update.sh`) pulls whatever branch it is on, so a clone left on
  a feature branch never installs what is merged (two merged notes went uninstalled,
  2026-10-25). Work in a worktree: `git -C ~/claude-config worktree add
  -b <branch> <dir> origin/main`. After a merge, `bash install.sh` from the
  clone applies it at once.
