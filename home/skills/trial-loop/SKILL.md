---
name: trial-loop
description: Measure and raise how well fresh Claude sessions work in a project, until a round of trials comes back clean. Use when asked to rate, test, benchmark or improve Claude's performance on a repo ("get it to 10/10", "how good is Claude here", "make new sessions better"), after project-setup, or when sessions in a project keep hitting the same friction. Spawns fresh cloud sessions on representative real tasks, verifies every friction claim against its source, fixes the real ones in the global config or the project, and reruns.
---

# Trial loop — measure fresh sessions, fix what they hit, repeat

A session cannot judge its own setup: it already knows what a fresh one would
have to discover. The only reliable measure is a fresh session doing a real
task and reporting what got in its way. This is the loop that took one project
from frequent friction to clean trials (Oct 2026).

## 1. Pick the tasks

Three task types cover most of what goes wrong. Use real queued work (the plan,
the issues, the board), not invented exercises:

| Type | Tests |
|---|---|
| A hard task: money, auth, data, or one needing design | whether the session respects decisions, rules and failing-test-first |
| A UI or feature task | triage, premise checks, rendering instead of reading templates |
| An unknown-cause bug (a flaky test is ideal) | reproduce, control, root cause instead of a guess |

At least one round must be **write mode**: commit, push, draft PR, CI green,
no merge. Read-only trials never exercise the push, CI and PR path, where much
friction lives. Before starting, check the premise of each task: is it still
open, and does an open PR already touch it?

## 2. Run them

- `create_session` in **the environment real work uses** (same setup script and
  effort), on the repo's default branch, with a title naming the trial.
- The prompt is what the owner would type, plus this report request:
  1. what you found or shipped (PR, CI run number and conclusion);
  2. procedure: each skill, rule, agent and hook used, helped or ceremony;
  3. friction: what cost time or misled you, each claim checked against its source;
  4. effort: the output of `echo $CLAUDE_CODE_EFFORT_LEVEL`;
  5. shortcuts: what you skipped or did partly, and why.
- Do not hand the trial what a previous trial found: whether it finds it alone is
  part of the measurement.
- **Never message a trial session, and ask the owner not to.** One message turns
  a measurement into a conversation.
- Schedule a check-in (`send_later`), and end the turn; do not poll. Read results
  with `list_events` and `kinds: ["result"]`.

## 3. Verify every claim

A trial's friction list is a set of claims, and some are wrong: in one round,
two of a dozen were misreadings. Open the source of each one (the file and line,
the hook's code, the board card, the CI log) and sort it:

- **Real**: fix it.
- **Misread**: if the misreading came from unclear wording, clarify the wording;
  otherwise drop it.
- **The owner's**: their board, their decisions, their business facts. Report
  it; never edit it on their behalf.

Also verify what a write-mode trial says it shipped: open its PR and its CI run.

## 4. Fix where it belongs

- **Generic** (any project would hit it: a missing tool, a skill's wrong
  default, a workflow rule) → the global config repo (`yoavits/claude-config`:
  `home/CLAUDE.md`, a hook, a skill), with its tests.
- **This project** → its CLAUDE.md, `.claude/rules/`, docs, status lines, tests.
- One commit per theme. Push, check CI, keep going until green.
- A stale record is the commonest friction: a status line, a decision marked
  open after it was made, a comment describing code that has changed. Fix the
  record, and cite the source that proves the new state.

## 5. Score honestly

A task type is **clean** when its trial reports no friction that survives
verification. **10/10** means every type clean in the same round, including a
write-mode round with CI green. Record the effort level each trial ran at:
the same task at `low` and `high` effort gave very different results, so a score
without its effort is not comparable.

Report to the owner per type: clean or not, what was fixed (commit and CI run),
what is theirs to decide. Then rerun only the types that were not clean.
