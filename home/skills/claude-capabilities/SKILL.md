---
name: claude-capabilities
description: The full map of what Claude Code can do, and which feature, tool, mode, model or effort level fits a task. Use at the start of any non-trivial task to pick the approach; whenever the question is "can Claude do X", "is there a way to", "how do I make Claude always/never/automatically"; when choosing between a skill, subagent, workflow, hook, MCP server, routine, /goal or /loop; when setting permission mode, effort, model, ultracode, fast mode or the advisor; when work needs to run in parallel, keep running, run on a schedule, or reach another session; and when a result needs to reach the owner as a page, file or notification. Researched from code.claude.com/docs on 12 Oct 2026.
---

# Claude capabilities — what exists and when to use it

Researched from the official docs (`https://code.claude.com/docs/llms.txt` is the
index; every page is also served as `.md`) on **12 Oct 2026**. Installed from
**yoavits/claude-config**. Features move fast: when something here disagrees with the
live docs, the docs win — re-read the page and update this file.

**A project's CLAUDE.md wins over this skill** for anything about how that project works.

---

## 1. Pick the approach first

| The task needs… | Use | Not |
|---|---|---|
| A rule that must hold every time | a **hook** (`PreToolUse` can block a tool call) | CLAUDE.md — that is a request, not a guarantee |
| A rule Claude should always know | **CLAUDE.md** (or `.claude/rules/*.md`, path-scoped) | a skill |
| Knowledge or a procedure needed sometimes | a **skill** (loads on demand) | CLAUDE.md — bloat makes Claude ignore half of it |
| A side task that would flood context | a **subagent** (returns a summary) | doing it inline |
| Dozens of agents, or findings cross-checked | a **dynamic workflow** (`Workflow` tool) — *only on the user's explicit opt-in* | a pile of subagents |
| One big mechanical change across many files | `/batch` (5–30 worktree-isolated subagents) | a hand sweep |
| An external system (DB, Slack, browser, Trello) | an **MCP server / connector** | copy-paste |
| Work until a verifiable end state | `/goal <condition>` | re-prompting |
| Re-run something on an interval in this session | `/loop` / `CronCreate` | `sleep` in Bash |
| Run without any session open | a **routine** (`/schedule`, cloud) | `/loop` |
| React to events while away | **channels** (MCP push) or PR subscription | polling |
| A hard design decision mid-task | the **advisor** (`/advisor`) or a stronger model | guessing |
| A result someone will look at or share | an **artifact** (`Artifact` tool) | terminal text |
| A file the owner needs on their device | `SendUserFile` | a path in prose |
| Typed-language navigation | the `LSP` tool (install a code-intelligence plugin) | grep |

Order for a hard task (`~/.claude/CLAUDE.md`): `brainstorming` → `writing-plans` →
`executing-plans` / `test-driven-development` → `systematic-debugging` →
`verification-before-completion` → `requesting-code-review`.

---

## 2. The dials — modes, models, effort

### Permission modes (`Shift+Tab`, `--permission-mode`, `/config`)

| Mode | Runs without asking | Use for |
|---|---|---|
| `default` | reads only | sensitive work, unfamiliar code |
| `acceptEdits` | reads, edits, `mkdir`/`mv`/`cp`… in working dirs | iterating on code you review |
| `plan` | reads (+ classifier-approved commands) | explore, then present a plan via `ExitPlanMode` |
| `auto` | everything, with a background safety classifier | long tasks, fewer prompts |
| `dontAsk` | pre-approved tools only; anything else denied | locked-down CI, scripts |
| `bypassPermissions` | everything | isolated containers/VMs only |

Plan mode is the right start for a multi-file change whose shape is not obvious.
`/permissions` manages allow/ask/deny rules; `/fewer-permission-prompts` mines
transcripts for safe read-only commands to allow. `/sandbox` restricts Bash's
files and hosts.

### Models (`/model`, `--model`, `model` in settings)

| Alias | Resolves to (Anthropic API) | For |
|---|---|---|
| `fable` / `best` | Fable 5.1 | hardest, longest tasks |
| `opus` | Opus 5.5 | complex reasoning |
| `sonnet` | Sonnet 5.5 | daily coding |
| `haiku` | Haiku 5.5 | simple, fast |
| `opus[1m]` / `sonnet[1m]` | 1M-token context | very long sessions |
| `opusplan` | Opus in plan mode, Sonnet to execute | plan-heavy work, cheaper execution |

Subagents and skills can pin their own `model:`. A model switch mid-session costs
one slow uncached turn.

### Effort (`/effort`, `--effort`, `CLAUDE_CODE_EFFORT_LEVEL`)

`low` · `medium` · `high` · `xhigh` · `max` on the 5.x models. **Opus/Sonnet/Haiku
5.5 default to `medium`.** Pick by task, not habit:

| Effort | When |
|---|---|
| `low` | lookups, renames, one-line fixes |
| `medium` | ordinary edits with a clear target |
| `high` | features, multi-file changes, unfamiliar code |
| `xhigh` | money, auth, concurrency, a bug that resisted one attempt |
| `max` | a single hard decision; session-only unless set by env var |

Unsupported levels fall back to the highest supported one at or below.
Skills and subagents accept `effort:` in frontmatter to override per task.

**Ultracode** (`/effort ultracode`, `--effort ultracode` → `xhigh` + on): Claude
orchestrates dynamic workflows for substantive tasks. Big token spend; the
user turns it on, not Claude.

### Other dials

- **Fast mode** (`/fast`) — faster Opus output, same model.
- **Advisor** (`/advisor <model>`, experimental, Anthropic API only) — Claude
  consults a stronger model before committing to an approach, when stuck, or
  before declaring done. Best on long tasks where plan quality decides the outcome.
- **Output styles** (`/output-style`) — e.g. `Concise`, `Explanatory`. Styles
  shape responses; CLAUDE.md shapes knowledge.
- **Auto-compact window** (`/autocompact <tokens>|auto`) and `/compact [focus]`.

---

## 3. Built-in tools

| Group | Tools |
|---|---|
| Files | `Read` (also images, PDFs via `pages`, notebooks), `Write`, `Edit`, `NotebookEdit`, `Glob`, `Grep`, `LSP` |
| Shell | `Bash` (background with `run_in_background`), `PowerShell`, `Monitor` (stream a command's output lines back; can open a WebSocket) |
| Web | `WebFetch`, `WebSearch` (`standard` vs `extended` mode — extended for niche, very recent, prices, multi-step) |
| Agents | `Agent` (subagents), `SendMessage`, `ListAgents`, `Workflow`, `TaskStop`, `SubagentHandback` |
| Planning | `EnterPlanMode` / `ExitPlanMode`, `TaskCreate` / `TaskGet` / `TaskList` / `TaskUpdate`, `AskUserQuestion` |
| Isolation | `EnterWorktree` / `ExitWorktree` |
| Time | `CronCreate` / `CronDelete` / `CronList`, `ScheduleWakeup` (self-paced `/loop`), `RemoteTrigger` (routines) |
| Skills & MCP | `Skill`, `ToolSearch` (loads deferred tools), `ListMcpResourcesTool`, `ReadMcpResourceTool`, `WaitForMcpServers` |
| Output | `Artifact`, `SendUserFile`, `PushNotification`, `ReportFindings` (code-review results) |

**Deferred tools** appear by name only; load the schema with
`ToolSearch("select:<name>")` before calling. Independent tool calls go in one
message so they run in parallel.

---

## 4. The extension layer

### Memory

| | CLAUDE.md | `.claude/rules/*.md` | Auto memory |
|---|---|---|---|
| Written by | you | you | Claude |
| Loads | every session | every session, or only when `paths:` globs match | every session (first 200 lines / 25 KB) |
| For | always-true rules | topic or directory rules | preferences, corrections, context not derivable from code |

- `@path/to/file` in CLAUDE.md **imports** that file at launch (4 hops max;
  backticks keep it literal). Use sparingly — imported text costs context every
  session; link long reference files instead of importing them.
- Docs guidance: **keep CLAUDE.md under ~200 lines**; move reference material to
  skills or rules. An over-long CLAUDE.md is a named failure pattern. A
  path-scoped rule loads when Claude reads or edits a matching file (verified
  live).
- **CLAUDE.md edits don't apply mid-session** (prompt caching); they take effect
  next session. Hook changes in `.claude/settings.json` and new path-scoped rules
  did apply mid-session (observed 12 Oct 2026).
- Auto memory lives in `~/.claude/projects/<project>/memory/` — **ephemeral in a
  cloud container**, so anything durable goes in a committed file.
- `/memory` edits memory files and toggles auto memory.
- **User level** (`~/.claude/CLAUDE.md`, `~/.claude/skills/`, `~/.claude/settings.json`)
  applies to every project. Skills override by name: managed > user > project,
  so a user-level skill shadows a project skill of the same name.

### Skills (`.claude/skills/<name>/SKILL.md`)

**Finding one**: the session's skill list shows project and user skills;
`SearchSkills` / `ListSkills` search only account and organisation skills and
cannot see those. Frontmatter that matters: `description` (what triggers it — put
the trigger words here), `disable-model-invocation: true` (manual `/name` only), `user-invocable:
false` (Claude-only), `allowed-tools` / `disallowed-tools`, `model`, `effort`,
`context: fork` (+ `agent`, `background`) to run in a subagent, `paths` (auto-load
only for matching files), `hooks`, `arguments`. `/skills` lists them,
`/reload-skills` picks up new ones mid-session, `/skill-doctor` shows each
skill's context cost and use. `npx skills update` re-installs any skill in
`skills-lock.json` whose folder hash changed — **it overwrites local edits**, so
keep adapted skills out of the lock.

### Subagents (`.claude/agents/<name>.md`)

Frontmatter: `name`, `description`, `tools` / `disallowedTools`, `model`,
`permissionMode`, `maxTurns`, `skills` (preloaded in full), `mcpServers`,
`hooks`, `memory` (`user`/`project`/`local` persistent memory), `background`,
`isolation: worktree`, `effort`, `omitClaudeMd`. Built-in types include
`general-purpose`, `Explore` (read-only fan-out search) and `Plan`; projects add
their own in `.claude/agents/`. A subagent's report is not shown to the
user — relay what matters. Resume one with `SendMessage` to keep its context.

### Hooks (`.claude/settings.json`)

Handler types: `command`, `http`, `prompt`, `agent` (experimental), MCP tool.
Events: `SessionStart`, `Setup`, `UserPromptSubmit`, `UserPromptExpansion`,
`PreToolUse` (can block), `PermissionRequest`, `PermissionDenied`, `PostToolUse`,
`PostToolUseFailure`, `PostToolBatch`, `Notification`, `MessageDisplay`,
`SubagentStart` / `SubagentStop`, `TaskCreated` / `TaskCompleted`, `Stop`,
`StopFailure`, `TeammateIdle`, `InstructionsLoaded`, `ConfigChange`,
`CwdChanged`, `DirectoryAdded`, `FileChanged`, `WorktreeCreate` /
`WorktreeRemove`, `PreCompact` / `PostCompact`, `PreModelSwitch` /
`PostModelSwitch`, `Elicitation` / `ElicitationResult`, `SessionEnd`.
`/hooks` shows what is registered. Use the `update-config` skill to change them.

### MCP, plugins, mods

- **MCP**: `/mcp` to connect/reconnect/authenticate; scopes local > project
  (`.mcp.json`) > user. Many tools load deferred via `ToolSearch`.
- **Plugins** bundle skills, agents, hooks and MCP servers (`/plugin`,
  `/reload-plugins`); their skills are namespaced `plugin:skill`.
- **Mods** add panes, commands and tool-call rules to the interface
  (`plugin-authoring` skill).

---

## 5. Parallel and long-running work

| Approach | Who decides what runs next | Scale |
|---|---|---|
| Subagents (`Agent`) | Claude, turn by turn | a few per turn; run in background by default |
| `/subtask` / `/fork` | forked copy of this conversation | one side task |
| Dynamic workflows (`Workflow`) | a script Claude writes; resumable | dozens–hundreds; **explicit user opt-in only** |
| `/batch` | skill: research, split, 5–30 worktree agents | one large change |
| Agent teams | a lead over peer sessions (experimental, off by default) | a handful of long-running peers |
| Agent view (`claude agents`), Projects | the user, across sessions | many sessions |
| Worktrees (`--worktree`, `isolation: worktree`) | — | keeps parallel edits apart |
| Cross-session messaging (`SendMessage`, `ListAgents`) | — | pass findings between sessions |

### Keep working without being prompted

| Tool | Next turn starts when | Survives session end |
|---|---|---|
| `/goal <condition>` | previous turn ends; a model judges the condition | no |
| `/loop [interval]` / `CronCreate` | interval elapses (omit interval to self-pace) | restored on `--resume`, 7-day expiry |
| `send_later` (cloud) | a set time | yes |
| Routines (`/schedule`, `create_trigger`) | schedule, API POST, or GitHub event | yes — fresh cloud clone |
| Channels | an external event is pushed in | needs the session open |
| PR subscription (`subscribe_pr_activity`) | CI, review, comment, merge | yes, while subscribed |

Never `sleep` in Bash to wait; background the command, use `Monitor`, or end the
turn and let the event wake the session.

---

## 6. Session control

- **Checkpoints**: every prompt snapshots files Claude edited (last 100).
  `/rewind` or `Esc Esc` restores code and/or conversation. Bash side effects are
  not rewound.
- `/compact [focus]`, `/clear`, `/context` (what is using the window), `/btw`
  (side question without polluting context), `/branch` (fork the conversation),
  `/diff`, `/recap`, `/rename`, `/resume`, `--continue`, `--from-pr`.
- `/doctor` diagnoses install, settings and CLAUDE.md problems; `/debug` turns on
  debug logging; `/status`, `/usage`.

---

## 7. Review, security, verification

| Command / skill | What it does |
|---|---|
| `/code-review [low…max\|ultra] [--fix] [--comment]` | correctness review of a diff, PR or path |
| `/ultrareview` | deep multi-agent review in a cloud sandbox |
| `/security-review` | security pass over the branch diff |
| `/simplify` | four review agents for reuse/simplification, then applies fixes |
| `claude-security` plugin | full vulnerability scan → verified patch files |
| `pr-review-toolkit`, `code-review`, `feature-dev` plugins | specialised review and feature agents (enabled here) |
| `/run`, `/verify` | launch the app and watch the change work, not just tests |
| `/autofix-pr` | cloud session that pushes fixes when CI fails |

---

## 8. Output that reaches people

- **Artifacts** (`Artifact` tool): private interactive pages on claude.ai —
  reports, dashboards, apps, decks (`/slides`), designs (`/design`). Load the
  `artifact-design` skill first; `artifact-capabilities` for live data, shared
  state, files. Start a new one with `action: "quickstart"`.
- **Claude Docs** connector: living documents to read and edit together.
- `SendUserFile` for a file, `PushNotification` for a ping, `/dataviz` for charts.

---

## 9. Cloud sessions vs your machine

- **Cloud sessions** (claude.ai/code) run in an ephemeral container: anything
  worth keeping is committed and pushed, and `~/.claude` (auto memory, user
  CLAUDE.md, user skills) is rebuilt each time — which is why this setup is
  installed by the environment's **setup script**. Egress goes through a proxy;
  when a host, tool, connector or push is refused, read the environment docs
  (`read_documentation`) before reasoning about it. GitHub there goes through the
  `mcp__github__*` tools; after a push, open a draft PR and `subscribe_pr_activity`.
  The Claude GitHub app cannot create repositories — the owner does that.
- **Your machine** (CLI, desktop, IDE): `~/.claude` persists; `install.sh` puts
  this setup there and updates it when run again. Auto memory works there.
- **Model identity**: report the serving model from `get_session`
  (`session_context.model`, `external_metadata.last_served_model`) in the cloud,
  or `/status` locally — never from memory — and never put a model ID in a
  commit, PR or code comment.
- **What is connected**: `/mcp` lists MCP servers and their auth state; `/context`
  shows what is using the window; `/hooks` and `/skills` show what loaded.

---

## 10. Sources

`https://code.claude.com/docs/en/<page>.md` — `features-overview`,
`tools-reference`, `commands`, `memory`, `permission-modes`, `model-config`,
`skills`, `sub-agents`, `hooks-guide`, `agents`, `workflows`, `routines`, `goal`,
`scheduled-tasks`, `checkpointing`, `advisor`, `channels`, `artifacts`,
`cloud-environments`, `best-practices`, `claude-code-on-the-web`, and the
*What's new* digests to week 37 (Fable 5.1, background computer use on Desktop,
a live `/diff` panel, `/design`, `claude plugin eval`). To refresh: fetch
`llms.txt`, diff its page list against section 10, and read what is new.
