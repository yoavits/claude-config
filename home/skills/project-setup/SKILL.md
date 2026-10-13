---
name: project-setup
description: Make any repository ready for fresh Claude sessions to work in at full strength. Use on the first session in a repo that has no CLAUDE.md (the prompt reminder says so), when its CLAUDE.md does not say how to run the tests, or when asked to "set up Claude for this project", "onboard Claude", or make Claude work as well here as elsewhere. Builds a project CLAUDE.md from the repo itself, makes the full test suite runnable in a cloud container through a SessionStart hook, adds path-scoped rules for the risky areas, and records where decisions live.
---

# Project setup — what a project needs so a fresh session starts at full strength

The global setup (`~/.claude/CLAUDE.md`) knows *how* to work. It does not know
what this project is, how its tests run, which files are generated, or where
the owner's decisions are written down. Sessions in a repo without that lose
most of their time rediscovering it, and some of it they get wrong. This skill
writes it down once, from the repo, verified.

Distilled from a project that went from frequent friction to clean trials
(Oct 2026). Every step below exists because a session lost time without it.

## 0. What is already there

Read before writing: `CLAUDE.md`, `.claude/` (rules, hooks, agents, skills,
settings), `AGENTS.md`, `.cursorrules`, `.github/copilot-instructions.md`,
`README`, `CONTRIBUTING`. Extend what exists; never replace a project's own
rules with generic ones. If a CLAUDE.md exists and already covers sections 2–5,
stop and say so.

## 1. Find out, don't guess

The truth about how a project builds and tests is in what runs, not in the
README:

- **CI workflows first** (`.github/workflows/`, `.gitlab-ci.yml`, …): they are
  the only commands proven to work, with the runtime version and services they
  need.
- Manifests and lockfiles (`package.json` engines and scripts,
  `pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`, …), `Makefile`,
  `Dockerfile`, `docker-compose.yml`, `.tool-versions`, `.nvmrc`.
- Then **run them**: install, lint, the full test suite, the build. Record what
  passes, what fails, and how long each takes. A command in CLAUDE.md that was
  never run is a guess that every later session trusts.

## 2. Make the whole suite run here

A session that cannot run the tests pushes and lets CI be the verdict, which
costs a cycle per mistake. If the suite needs anything the container lacks (a
runtime version, a database, a browser, a system package):

- Write `.claude/hooks/session-start.sh` and register it as a `SessionStart`
  hook in `.claude/settings.json` (`"command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/session-start.sh"`,
  a generous `timeout`). Guard it with `[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0`
  so it never touches a developer's machine.
- Idempotent and fast when already done (the container is cached after the
  hook completes). Synchronous: a test run that starts before its database is
  installed fails in ways that read like code bugs.
- Export what later commands need (PATH, binary locations) by appending to
  `$CLAUDE_ENV_FILE`. Its stdout goes into the session's context: end with one
  line saying how to run the tests.
- When a download is blocked by the network policy, find another source (a
  package manager mirror, conda-forge) rather than giving up; the error may not
  say "blocked".
- **Prove it:** run the full suite through the hook from a fresh shell, and
  break one test on purpose to see the run go red.
- If something truly cannot run here, write down exactly which tests and why,
  so no session mistakes "skipped" for "passed".

Check the environment for traps and write them down: an env var pointing tests
at a production database (make the test helper refuse it), a default font, OS
or timezone that differs from CI, a tool that is missing (`ss`, `gh`).

## 3. Write the project CLAUDE.md

Only what must be true **before any file is opened**; under ~150 lines.
Sections, in this order:

1. **What it is**, and the one user action the product exists for, so trade-offs
   have a tiebreaker.
2. **Stack and commands**: exact, verified commands for install, dev server,
   test (the full suite and one file), lint, build. Note any generated artifact
   that is committed and must be rebuilt.
3. **Where things live**: a short directory map, and which layer holds the
   business logic and the tests worth trusting.
4. **Verification**: what "done" means here. Which tests, whether pages must be
   rendered rather than templates read, how to read CI from this environment
   (no authenticated `gh` in cloud sessions: the GitHub MCP tools).
5. **Hard constraints**: files never to hand-edit (generated, vendored,
   minified), secrets never to read, money/auth/data-deletion paths that need a
   failing test first, single-instance or other deployment assumptions.
6. **Decisions and approvals**: where the owner's decisions are recorded (a
   decisions file, the tracker). Work that depends on an open decision stops
   and names it. If nothing records decisions, create `DECISIONS.md` with
   open and resolved sections.
7. **The work queue**, if the project has one (plan file, issues, board), and
   the rule that its status lines are updated in the same commit as the code.
   Stale status lines are the most common way a fresh session is misled.

## 4. Rules for risky areas

For each area where a mistake is expensive (money, auth and access, data
deletion, migrations, generated artifacts, public copy with legal weight), a
`.claude/rules/<area>.md` with `paths:` frontmatter so it loads only when a
matching file is read. State the few rules that are never relaxed and why.
Money and auth: failing test first, and a review before push.

## 5. Guards a hook enforces better than prose

Only where cheap and clearly worth it: a `PreToolUse` hook that refuses hand
edits to generated files, or reads of secrets (a `permissions.deny` rule on
`Read(./.env*)` is simpler). Prose asks; a hook or rule enforces.

## 6. Finish

- Re-read CLAUDE.md as a newcomer: run every command it names.
- Commit it all as one change with a message saying what was verified, push,
  check CI.
- Then measure it: the `trial-loop` skill runs fresh sessions on real tasks and
  shows what is still missing.
