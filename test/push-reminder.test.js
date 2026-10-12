'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', 'home', 'hooks', 'push-reminder.js');

function run(command) {
    const input = JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command } });
    return spawnSync(process.execPath, [SCRIPT], { input, encoding: 'utf8', timeout: 5000 });
}

test('a push asks for a CI check, as PostToolUse context', () => {
    for (const cmd of [
        'git push -u origin feature',
        'git push -q origin main && git log --oneline -1',
        'cd repo && git add -A && git commit -qm x && git push',
        'git -C /home/user/claude-config push origin main'
    ]) {
        const r = run(cmd);
        assert.equal(r.status, 0, r.stderr);
        const out = JSON.parse(r.stdout);
        assert.equal(out.hookSpecificOutput.hookEventName, 'PostToolUse');
        assert.match(out.hookSpecificOutput.additionalContext, /Check CI/, cmd);
    }
});

test('silent on anything that is not a real push', () => {
    for (const cmd of ['git status', 'git log --grep push', 'echo "git push later"x', 'git push --dry-run origin main', 'npm test']) {
        const r = run(cmd);
        assert.equal(r.status, 0, r.stderr);
        assert.equal(r.stdout, '', `reminded on: ${cmd}`);
    }
    const bad = spawnSync(process.execPath, [SCRIPT], { input: 'not json', encoding: 'utf8' });
    assert.equal(bad.status, 0);
    assert.equal(bad.stdout, '');
});
