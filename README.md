# claude-config

My Claude Code setup: one place for the instructions, skills and hooks I want in
**every** project, installed into `~/.claude` so they apply whatever repository
a session opens.

| What | Installed to | Why |
|---|---|---|
| `home/CLAUDE.md` | `~/.claude/CLAUDE.md` | Global instructions: find the skill first, run hard tasks on Superpowers, verification, working style |
| `.agents/skills/*` | `~/.claude/skills/` | [obra/superpowers](https://github.com/obra/superpowers) (9 skills) and [find-skills](https://github.com/vercel-labs/skills), unmodified |
| `home/skills/claude-capabilities` | `~/.claude/skills/` | A map of everything Claude Code can do and which tool, mode and effort fits a task |
| `home/skills/project-setup` | `~/.claude/skills/` | Makes any repo ready for fresh sessions: a verified project CLAUDE.md, tests that run in the cloud container, rules for risky areas |
| `home/skills/trial-loop` | `~/.claude/skills/` | Measures a project with fresh trial sessions, verifies what they hit, fixes it, reruns until clean |
| `home/hooks/push-reminder.js` | `~/.claude/hooks/` + `settings.json` | After a `git push`, says to check CI on the pushed branch |
| `scripts/self-update.sh` | `settings.json` (SessionStart) | Pulls this repo at each session start and re-installs when it moved, so a pushed change reaches the next session |

A project's own `CLAUDE.md` always wins over the global one for that project.

## Install

**On your computer** (macOS, Linux, or Git Bash on Windows; needs `node`):

```bash
git clone https://github.com/yoavits/claude-config ~/claude-config
bash ~/claude-config/install.sh
```

It keeps itself up to date: each session start pulls `~/claude-config` and re-installs if it moved.

**In cloud sessions** (claude.ai/code): open the environment's settings (the
environment menu in a session's title bar → **Edit**) and add this line to its
**Setup script**:

```bash
git clone --depth 1 https://github.com/yoavits/claude-config /tmp/claude-config && bash /tmp/claude-config/install.sh
```

Every new session in that environment then starts with this setup, whatever
repository it opens. Also add the environment variable
`CLAUDE_CODE_EFFORT_LEVEL=high` there: effort in cloud sessions comes from the
environment, not from settings. **Do both in every environment you use**, or
use one environment for every project; an environment without them runs plain
Claude Code. A cloud environment runs its setup script once and starts
later sessions from a snapshot; the self-update hook pulls this repo at each
session start, so changes pushed here arrive without editing the script again.

### What the installer touches

- `CLAUDE.md` is replaced. A previous one that did not come from here is kept
  once as `CLAUDE.md.before-claude-config`.
- Each shipped skill folder is replaced. Skills of yours with other names are
  left alone. A user-level skill shadows a project skill of the same name.
- `settings.json` gets the push-reminder and self-update hooks merged in, and the
  prompt reminder an earlier install added is removed. Every other setting and hook
  is kept, a re-run never adds a second copy, and a file that does not parse is
  refused rather than overwritten.
- `CLAUDE_CONFIG_DIR` is honoured if set.

## Change it

Edit this repo, not the installed copy in `~/.claude`, which the next install
overwrites. `npm test` runs the install into a scratch home and checks the hook.
CI runs it on Linux, macOS and Windows.

`npm run update-skills` refreshes the vendored upstream skills (`skills-lock.json`
tracks them). They are kept **unmodified** so updates stay safe: put any
override in `home/CLAUDE.md`, never in a vendored skill's folder, or the next
update erases it.

Third-party licences: [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
