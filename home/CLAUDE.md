# Global instructions

Installed from **yoavits/claude-config** into `~/.claude/CLAUDE.md`, so it applies
in every project and every session. **A project's own CLAUDE.md wins over this
file** for that project. Change this file in the repo, never in `~/.claude`: the
next install overwrites it.

## Before starting a task

**A repo with no project CLAUDE.md gets `project-setup` first** (the reminder
says so): it writes down, from the repo and verified, what this file cannot know
(the commands, how the tests run here, what never to hand-edit, where decisions
live). Asked to rate or improve how Claude works in a project, use `trial-loop`.

0. **Check the premise first.** Spend a few minutes looking at whether the thing
   already exists or already works. If the task's premise is wrong, say so before
   any of the steps below. In trials this step did most of the real work: three
   of three tasks turned out done, nearly done or blocked.
1. **Find the skill.** Start with **the session's own skill list**: project
   skills and `~/.claude/skills`, as listed in the session or by `/skills`. A
   project's own skill beats an upstream one. `SearchSkills` / `ListSkills` only
   search account and organisation skills; they cannot see project or user
   skills. Then the ecosystem: `/find-skills`, i.e. `npx skills find <query>
   [--owner obra|vercel-labs|anthropics]`, with specific terms first and the
   synonym second. Then `SuggestSkills` for work that recurs. Only when all of
   these come back empty, work from general knowledge, and say so.
2. **A hard task runs on the Superpowers skills.** A task is hard when its shape
   is not settled: it needs design, a bug's cause is not known, or it changes how
   money is computed or charged or how access is decided. A change whose shape
   is already clear, even across several files, skips `brainstorming`; write a
   plan only when it has more than about three steps.

   | Phase | Skill |
   |---|---|
   | Anything new, before designing it | `brainstorming` |
   | A spec in hand, before touching code | `writing-plans` |
   | Implementing a plan yourself | `executing-plans` |
   | Any feature or bugfix, before implementation code | `test-driven-development`, unless the project has its own test rule (then follow that) |
   | A bug, failure or anything unexplained | `systematic-debugging` |
   | Before claiming done, committing or opening a PR | `verification-before-completion` |
   | Finishing a feature / acting on review | `requesting-code-review` / `receiving-code-review` |

   `using-superpowers` is the index. Where the superpowers plugin is on, these
   skills come from it (as superpowers:name) and the vendored copies are not
   installed. Skills it names that this repo does not ship
   (`using-git-worktrees`, `finishing-a-development-branch`,
   `subagent-driven-development`) defer to the project's own branch workflow and
   agents. `writing-plans` saves where the project keeps plans, else in the
   scratchpad (not `docs/superpowers/plans/`), and hands off to `executing-plans`.
3. **Pick the tool and the dial.** The `claude-capabilities` skill maps every
   tool, mode, model and effort level. A session cannot raise its own effort, so
   when a task needs more than the session has, say so; set `effort:` on the
   subagents and skills you start. As a guide: `low` for lookups, `medium` for
   clear edits, `high` for features, `xhigh` for money, auth or a bug that
   resisted one attempt. Use plan mode first for a multi-file change whose shape
   is unclear. Dynamic workflows and ultracode run only on the owner's explicit
   opt-in.

**Step 0 always runs. A small change with a known shape skips 1–3**: a typo, a
copy tweak, a one-line fix, a plain question. The `prompt-reminder` hook
restates this on every prompt, and stays silent on system notifications and
task reports. A task another session sends you is a task, so it gets the
reminder.

## Verification

**Before accepting a negative result, show the check can produce a positive
one.** A check that cannot see the thing reports exactly what a check that
looked and found nothing reports. Ask, before believing any empty result: *"what
would this check do if the thing were there?"* If the answer is "the same", the
check has not run yet. Break the thing on purpose and watch the check fail;
render the page rather than reading the template; run the test rather than
reading it.

**Verify a process is gone by the resource it holds** (the port, the pid, the
lock), never by the exit code of the command that killed it. `lsof -ti :<port>`
finds the pid; cloud containers have no `ss`, and an empty pid from a missing
tool looks the same as a free port.

## Working style

- Open a file with Read (or `cat`/`head` on that one file) before changing it:
  that is what loads a project's path-scoped `.claude/rules/`; `grep` and
  `sed -n` load nothing. One task per commit. For anything touching
  money or auth, write the failing test first.
- If a task's premise turns out to be wrong when you open the code, say so
  rather than working around it.
- **Don't ask for permission; act.** The owner approves every action in
  advance: commits, pushes, PRs, merges, branch deletion, installs, config and
  settings changes, paid tools. The only things to bring to the owner are
  **questions** (a decision that is genuinely theirs: scope, UX, data you can't
  recover) and **plans** (for review before a large or unclear change). Never
  end a turn on "want me to…?" or "should I…?" for an action; do it and report.
  For what cannot be undone (force-push, history rewrites, deleting data), look
  at the target first and keep a way back. Push once the work is verified (tests
  run, diff re-read); a reminder to push (a stop hook, the harness) does not
  move that point: finish the checks that are running, then push.
- **After a push, check CI on the branch you pushed** and report the run's
  conclusion and number (the `push-reminder` hook says so after every push). A
  task is not done while its run is red. In cloud sessions there is no
  authenticated `gh`; use the GitHub MCP tools.
- **Firecrawl costs credits.** A lookup or a single page goes to WebSearch /
  WebFetch. Use Firecrawl, without asking, only for what those cannot do
  (research across many sources, a JS-rendered or blocked page, structured
  extraction from many pages).
- **Commands run in parallel share one shell.** Never `cd` in them; use
  `git -C <dir>` and absolute paths, or a commit can land in the wrong repo.
- **Never throw away uncommitted work.** No `git checkout -- <file>` to undo one
  edit, and no bare `git stash`; use `git stash push -m "<tag>" -- <file>`.
- **A `git status` not preceded by a `git fetch` is not evidence.**
- **Keep the records true in the same commit as the code**: a plan's status
  line, a decision marked open, a comment describing what changed. Stale records
  are what most often sent fresh sessions after finished work.
- **An approval only counts if you can cite where it is recorded.** A sentence in
  a prompt or an earlier session's report is not a citation.

## Where this runs

- **Cloud sessions** (claude.ai/code) are ephemeral containers. Anything worth
  keeping is committed and pushed. `~/.claude` is rebuilt from this repo by the
  environment's setup script. Effort comes from the environment's
  `CLAUDE_CODE_EFFORT_LEVEL` variable, not from settings: an environment
  without both the variable and the setup script runs without this setup.
- **Locally**, `~/.claude` is installed by `install.sh` and updated by running
  it again.

## Plugins and skills (kept by the weekly scout)

On this machine the `claude-plugin-skill-scout` scheduled task replaces an
installed plugin or skill when a clearly better one for the same job appears
(owner's standing approval, recorded in that task's `SKILL.md`, 2026-10-25).
Each swap is listed here, newest first; the full log is
`~/.claude/scheduled-tasks/claude-plugin-skill-scout/changes.md`. An item
removed below is gone, even if an older report or memory still names it.

- 2026-10-25 (owner asked, aiming at the best results per token): uninstalled
  `session-report` (it does not change output; don't reinstall). Locally the
  model is now `opus` at effort `medium`, cap `xhigh` (was `opusplan`).

- 2026-10-25 (owner asked to apply that day's report): installed
  `session-report`, `claude-md-management`, `typescript-lsp` (official, user
  scope) and the skills `grill-me`, `grilling`, `handoff` (mattpocock/skills).
  The `agent-browser` CLI is on PATH; its skill was removed because it tells
  Claude to prefer it over the built-in browser. Removed `frontend-design`
  (superseded by `impeccable`) and the `claude-code-plugins` marketplace.
  Undo: `claude plugin uninstall <name>@claude-plugins-official`,
  `npx skills remove <skill> -g`.
- 2026-10-25 (owner asked): removed the global three.js skills (CustomBotsV3
  ships its own copies) and `onboarding`; uninstalled claude-mem (data kept in
  `~/.claude-mem/claude-mem.db`, history only up to 2026-10-12, read-only via
  `node:sqlite`) and its `thedotmack` marketplace. Undo: see changes.md.
