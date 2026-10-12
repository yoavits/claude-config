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
#                              skills of yours with other names are left alone)
#   hooks/prompt-reminder.js   the UserPromptSubmit reminder
#   settings.json              the reminder hook merged in; every other setting kept
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

count=0
for dir in "$SRC"/.agents/skills/*/ "$SRC"/home/skills/*/; do
  [ -f "$dir/SKILL.md" ] || continue
  name="$(basename "$dir")"
  rm -rf "${DEST:?}/skills/$name"
  cp -R "$dir" "$DEST/skills/$name"
  count=$((count + 1))
done

cp "$SRC/home/hooks/prompt-reminder.js" "$DEST/hooks/prompt-reminder.js"

# $HOME stays literal in the default case so the same settings work from any
# shell, including Git Bash on Windows, which converts the path for node.
if [ "$DEST" = "$HOME/.claude" ]; then
  HOOK_CMD='node "$HOME/.claude/hooks/prompt-reminder.js"'
else
  HOOK_CMD="node \"$DEST/hooks/prompt-reminder.js\""
fi
node "$SRC/scripts/merge-settings.js" "$DEST/settings.json" "$HOOK_CMD"

log "installed into $DEST: CLAUDE.md, $count skills, prompt-reminder hook"
