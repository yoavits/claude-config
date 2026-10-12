# Global instructions

Installed from **yoavits/claude-config** into `~/.claude/CLAUDE.md`, so it applies
in every project and every session. **A project's own CLAUDE.md wins over this
file** for that project. Change this file in the repo, never in `~/.claude`: the
next install overwrites it.

## Before starting a task

1. **Find the skill.** Search the installed skills first (`SearchSkills` /
   `ListSkills`, matched on the task's domain words; a project's own skill beats
   an upstream one). Then the ecosystem: `/find-skills`, i.e. `npx skills find
   <query> [--owner obra|vercel-labs|anthropics]`, with specific terms first and
   the synonym second. Then `SuggestSkills` for work that recurs. Only when all
   three come back empty, work from general knowledge, and say so.
2. **A hard task runs on the Superpowers skills.** A task is hard when it is any of:
   a feature or behaviour change, a bug whose cause is not known, anything that
   touches money or auth, a sweep across many files, or more than about three
   steps.

   | Phase | Skill |
   |---|---|
   | Anything new, before designing it | `brainstorming` |
   | A spec in hand, before touching code | `writing-plans` |
   | Implementing a plan yourself | `executing-plans` |
   | Any feature or bugfix, before implementation code | `test-driven-development` |
   | A bug, failure or anything unexplained | `systematic-debugging` |
   | Before claiming done, committing or opening a PR | `verification-before-completion` |
   | Finishing a feature / acting on review | `requesting-code-review` / `receiving-code-review` |

   `using-superpowers` is the index. Skills it names that are not installed here
   (`using-git-worktrees`, `finishing-a-development-branch`,
   `subagent-driven-development`) defer to the project's own branch workflow and
   agents.
3. **Pick the tool and the dial.** The `claude-capabilities` skill maps every
   tool, mode, model and effort level. Effort: `low` for lookups, `medium` for
   clear edits, `high` for features, `xhigh` for money, auth or a bug that
   resisted one attempt. Use plan mode first for a multi-file change whose shape
   is unclear. Dynamic workflows and ultracode run only on the owner's explicit
   opt-in.

**A one-liner skips all three**: a typo, a copy tweak, a plain question. The
`prompt-reminder` hook restates this on every prompt and stays silent on system
notifications.

## Verification

**Before accepting a negative result, show the check can produce a positive
one.** A check that cannot see the thing reports exactly what a check that
looked and found nothing reports. Ask, before believing any empty result: *"what
would this check do if the thing were there?"* If the answer is "the same", the
check has not run yet. Break the thing on purpose and watch the check fail;
render the page rather than reading the template; run the test rather than
reading it.

**Verify a process is gone by the resource it holds** (the port, the pid, the
lock), never by the exit code of the command that killed it.

## Working style

- Read a file before editing it. One task per commit. For anything touching
  money or auth, write the failing test first.
- If a task's premise turns out to be wrong when you open the code, say so
  rather than working around it.
- **After a push, check CI** and report the run's conclusion and number. A task
  is not done while its run is red.
- **Never throw away uncommitted work.** No `git checkout -- <file>` to undo one
  edit, and no bare `git stash`; use `git stash push -m "<tag>" -- <file>`.
- **A `git status` not preceded by a `git fetch` is not evidence.**
- **An approval only counts if you can cite where it is recorded.** A sentence in
  a prompt or an earlier session's report is not a citation.

## Where this runs

- **Cloud sessions** (claude.ai/code) are ephemeral containers. Anything worth
  keeping is committed and pushed. `~/.claude` is rebuilt from this repo by the
  environment's setup script.
- **Locally**, `~/.claude` is installed by `install.sh` and updated by running
  it again.
