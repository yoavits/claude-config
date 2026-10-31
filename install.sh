#!/usr/bin/env bash
#
# install.sh — put this repo's Claude Code setup into ~/.claude, so it applies
# in every project and every session.
#
#   bash install.sh            # local machine (macOS, Linux, Git Bash on Windows)
#
# In a cloud environment, add to its setup script (environment settings → Edit):
#
#   git clone --depth 1 https://github.com/yoavits/claude-config /tmp/claude-config && bash /tmp/claude-config/install.sh
#
# What it installs (into ${CLAUDE_CONFIG_DIR:-~/.claude}):
#   CLAUDE.md                  global instructions        (overwritten: edit the repo, not the copy)
#   skills/<name>/             every skill in .agents/skills and home/skills (replaced per skill;
#                              skills of yours with other names are left alone; the vendored
#                              superpowers skills are skipped while that plugin is enabled)
#   hooks/push-reminder.js     the PostToolUse reminder to check CI after a push
#   settings.json              the push and self-update hooks merged in; the prompt reminder and the
#                              Firecrawl ask rules an earlier install added are removed; every other
#                              setting kept
#
# Idempotent: run it again to update. It needs node (Claude Code needs it anyway).
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

log() { printf '[claude-config] %s\n' "$*" >&2; }

command -v node >/dev/null 2>&1 || { log "node is required"; exit 1; }

mkdir -p "$DEST/skills" "$DEST/hooks"

# A CLAUDE.md that is not ours is kept once, beside it, rather than lost.
if [ -f "$DEST/CLAUDE.md" ] && ! grep -q "yoavits/claude-config" "$DEST/CLAUDE.md"; then
  cp "$DEST/CLAUDE.md" "$DEST/CLAUDE.md.before-claude-config"
  log "kept your previous CLAUDE.md as CLAUDE.md.before-claude-config"
fi
cp "$SRC/home/CLAUDE.md" "$DEST/CLAUDE.md"

# With the superpowers plugin on, its skills are already loaded: the vendored
# copies would list each one twice in every session, so they are skipped and an
# earlier install's copies removed. The cloud, without the plugin, still gets them.
skip="$(node -e '
  const fs = require("fs");
  let s = {}; try { s = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch {}
  const on = Object.entries(s.enabledPlugins || {}).some(([k, v]) => k.startsWith("superpowers@") && v === true);
  const lock = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).skills;
  if (on) for (const [name, l] of Object.entries(lock)) if (l.source === "obra/superpowers") console.log(name);
' "$DEST/settings.json" "$SRC/skills-lock.json")"

count=0
for dir in "$SRC"/.agents/skills/*/ "$SRC"/home/skills/*/; do
  [ -f "$dir/SKILL.md" ] || continue
  name="$(basename "$dir")"
  rm -rf "${DEST:?}/skills/$name"
  if printf '%s\n' "$skip" | grep -qx "$name"; then continue; fi
  cp -R "$dir" "$DEST/skills/$name"
  count=$((count + 1))
done

# The reminder on every prompt was noise (owner, 2026-10-31): an earlier install's copy goes.
rm -f "$DEST/hooks/prompt-reminder.js"
cp "$SRC/home/hooks/push-reminder.js" "$DEST/hooks/push-reminder.js"

# $HOME stays literal in the default case so the same settings work from any
# shell, including Git Bash on Windows, which converts the path for node.
if [ "$DEST" = "$HOME/.claude" ]; then
  PUSH_CMD='node "$HOME/.claude/hooks/push-reminder.js"'
else
  PUSH_CMD="node \"$DEST/hooks/push-reminder.js\""
fi
# The self-update runs from this clone, wherever it is (~/claude-config locally,
# /tmp/claude-config in the cloud), so a session pulls the repo it came from.
UPDATE_CMD="bash \"$SRC/scripts/self-update.sh\""
node "$SRC/scripts/merge-settings.js" "$DEST/settings.json" \
  unhook:UserPromptSubmit prompt-reminder.js \
  PostToolUse:Bash "$PUSH_CMD" \
  SessionStart "$UPDATE_CMD" \
  permissions.unask 'mcp__Firecrawl__*' \
  permissions.unask 'mcp__firecrawl__*'

log "installed into $DEST: CLAUDE.md, $count skills, the push reminder hook"
