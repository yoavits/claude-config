#!/usr/bin/env bash
#
# self-update.sh — a SessionStart hook that keeps ~/.claude in step with this
# repo, so a change pushed here reaches the next session without anyone
# touching the cloud environment's setup script.
#
# Why it exists: a cloud environment runs its setup script once and then starts
# every session from a snapshot of the result, so a clone made by the setup
# script is frozen at the commit it was made from until the script is edited.
# This pulls on each session start and re-installs only when the commit moved.
#
# Best effort, by design: it never fails a session. A missing network, a dirty
# clone or a diverged branch all mean "stay on what is installed" and exit 0.
# It prints only when it updated, because SessionStart output enters the
# session's context.
set -u

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SRC" 2>/dev/null || exit 0
before="$(git rev-parse HEAD 2>/dev/null)" || exit 0
timeout 20 git pull -q --ff-only >/dev/null 2>&1 || exit 0
after="$(git rev-parse HEAD 2>/dev/null)" || exit 0
[ "$before" = "$after" ] && exit 0

bash "$SRC/install.sh" >/dev/null 2>&1 || exit 0
echo "claude-config updated to $(git log --oneline -1 | cut -c1-80). Skills and hooks apply now; ~/.claude/CLAUDE.md changes apply from the next session."
exit 0
