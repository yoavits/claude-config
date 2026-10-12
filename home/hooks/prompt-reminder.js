#!/usr/bin/env node
/*
 * The prompt reminder, from yoavits/claude-config: ~/.claude/CLAUDE.md's
 * "Before starting a task", restated next to the prompt it applies to.
 *
 * A UserPromptSubmit hook, merged into ~/.claude/settings.json by install.sh.
 * Claude Code adds its plain stdout to the context as a system reminder.
 * CLAUDE.md is a request that competes with everything else in the window; a
 * hook is what the docs give for a rule that must actually be followed.
 *
 * It stays short, because it costs its length on every prompt, and fast,
 * because UserPromptSubmit blocks the prompt and a hook that reaches its
 * timeout has its output discarded. It always exits 0, so it can never block a
 * prompt.
 *
 * It stays silent when the "prompt" is not a person's task. UserPromptSubmit also
 * fires on CI and PR wakes, background-task reports and webhook deliveries,
 * which are recognised by the envelope they arrive in. Anything unrecognised,
 * including input it cannot parse, still gets the reminder: a reminder too many
 * is cheap, and a task that missed it is not.
 */

'use strict';

const REMINDER = [
    'Before starting a task (~/.claude/CLAUDE.md; a project CLAUDE.md wins):',
    '1. Find the skill: SearchSkills/ListSkills first, then /find-skills, then SuggestSkills.',
    '2. A hard task (feature or behaviour change, unknown-cause bug, money or auth, multi-file sweep,',
    '   more than ~3 steps) runs on Superpowers: brainstorming -> writing-plans -> executing-plans /',
    '   test-driven-development -> systematic-debugging -> verification-before-completion.',
    '3. Fit tool, mode and effort to the task (claude-capabilities skill).',
    'A one-liner or a plain question skips all three.'
].join('\n');

// Envelopes that carry something other than a person's request.
const NOT_A_TASK =
    /^\s*(?:<(?:system-reminder|task-notification|wake|webhook-payload|child-session-event|local-command-caveat|local-command-stdout)\b|\[SYSTEM NOTIFICATION)/;

function isTask(raw) {
    try {
        const { prompt } = JSON.parse(raw);
        return typeof prompt !== 'string' || !NOT_A_TASK.test(prompt);
    } catch {
        return true;
    }
}

let raw = '';
let finished = false;
function finish() {
    if (finished) return;
    finished = true;
    if (isTask(raw)) process.stdout.write(REMINDER + '\n');
    process.exit(0);
}

// Read the prompt, then decide. The timer caps the wait if stdin is never
// closed: it decides on what has arrived, because a hook that hung to its
// timeout would have its output dropped.
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
    raw += chunk;
});
process.stdin.on('error', finish);
process.stdin.on('end', finish);
setTimeout(finish, 2000).unref();
