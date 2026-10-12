#!/usr/bin/env node
/*
 * The push reminder, from yoavits/claude-config: after a successful `git push`,
 * tell the session to check CI on what it pushed.
 *
 * A PostToolUse hook on the Bash tool, merged into ~/.claude/settings.json by
 * install.sh. "Check CI after a push" was already a written rule and was still
 * missed on 12 Oct 2026: macOS and Windows sat red for two hours behind a
 * push nobody looked at again. A rule that has to fire at one exact moment
 * belongs in a hook, not in CLAUDE.md.
 *
 * PostToolUse only runs when the tool succeeded, so a rejected push says
 * nothing. Plain stdout is not shown to the model for this event; the text goes
 * out as JSON additionalContext. It always exits 0 and never blocks anything.
 */

'use strict';

const CONTEXT =
    'You just pushed. Check CI on the branch you pushed now (GitHub MCP actions_list, or gh run watch) ' +
    "and report the run's number and conclusion; a task is not done while its run is red.";

// git, any global options (-C dir, -c key=value, --no-pager...), then push.
const PUSH = /(?:^|[\s;&|(])git(?:\s+(?:-[Cc]\s+\S+|--?[\w-]+(?:=\S+)?))*\s+push\b/;
const DRY_RUN = /\s(?:--dry-run|-n)(?:\s|$)/;

function isPush(raw) {
    try {
        const { tool_input: input } = JSON.parse(raw);
        const command = input && typeof input.command === 'string' ? input.command : '';
        return PUSH.test(command) && !DRY_RUN.test(command);
    } catch {
        return false;
    }
}

let raw = '';
let finished = false;
function finish() {
    if (finished) return;
    finished = true;
    if (isPush(raw)) {
        process.stdout.write(
            JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: CONTEXT } }) + '\n'
        );
    }
    process.exit(0);
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
    raw += chunk;
});
process.stdin.on('error', finish);
process.stdin.on('end', finish);
setTimeout(finish, 2000).unref();
