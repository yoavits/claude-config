'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'home', 'hooks', 'prompt-reminder.js');

function run(input) {
    return spawnSync(process.execPath, [SCRIPT], {
        input: typeof input === 'string' ? JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: input }) : input.raw,
        encoding: 'utf8',
        timeout: 5000
    });
}

test('it prints the reminder, short and fast', () => {
    const started = Date.now();
    const r = run('fix the login bug');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Before starting/);
    assert.ok(r.stdout.length < 400, `${r.stdout.length} chars on every prompt`);
    assert.ok(Date.now() - started < 1500);
});

test('every skill it names is shipped by this repo', () => {
    // Names are read out of the reminder, not checked from a list: a list matched
    // by substring passes with a typo that has the real name as a prefix.
    const PROSE = new Set(['one-liner', 'multi-file', 'unknown-cause']);
    const out = run('x').stdout;
    const named = new Set((out.match(/[A-Za-z]+(?:-[A-Za-z]+)+/g) || []).filter((w) => !PROSE.has(w)));
    if (/\bbrainstorming\b/.test(out)) named.add('brainstorming');
    assert.ok(named.size >= 4, `only ${named.size} recognised`);
    const shipped = (s) =>
        fs.existsSync(path.join(ROOT, '.agents', 'skills', s, 'SKILL.md')) || fs.existsSync(path.join(ROOT, 'home', 'skills', s, 'SKILL.md'));
    for (const s of named) assert.ok(shipped(s), `${s} is named but not shipped`);
});

test('every skill the global CLAUDE.md names is shipped too', () => {
    const md = fs.readFileSync(path.join(ROOT, 'home', 'CLAUDE.md'), 'utf8');
    const NOT_SHIPPED = new Set(['using-git-worktrees', 'finishing-a-development-branch', 'subagent-driven-development']);
    const named = [...md.matchAll(/`([a-z]+(?:-[a-z]+)+)`/g)].map((m) => m[1]).filter((n) => !NOT_SHIPPED.has(n) && !n.endsWith('-reminder'));
    const shipped = (s) =>
        fs.existsSync(path.join(ROOT, '.agents', 'skills', s, 'SKILL.md')) || fs.existsSync(path.join(ROOT, 'home', 'skills', s, 'SKILL.md'));
    for (const s of named) assert.ok(shipped(s), `${s} is named in home/CLAUDE.md but not shipped`);
    assert.ok(md.split('\n').length <= 200, 'the global CLAUDE.md loads in every session; keep it short');
});

test('silent on system notifications; reminds on anything else', () => {
    for (const p of [
        '<system-reminder>\n[SYSTEM NOTIFICATION - NOT USER INPUT]',
        '<task-notification>\n<task-type>x</task-type>',
        '<wake reason="external-event">',
        '<webhook-payload>{}</webhook-payload>',
        '[SYSTEM NOTIFICATION - NOT USER INPUT]',
        // A hand-back with a short preamble before its envelope (12 Oct 2026).
        'Agent finished.\n<task-notification>\n<status>completed</status>',
        'Report follows.\n<system-reminder>\n[SYSTEM NOTIFICATION - NOT USER INPUT]',
        // A subagent's report, as it arrives in the parent (re-trial, 12 Oct 2026).
        '<agent-message from="af536fdfc0471f01b">\n[Subagent hand-back] The text below is the final report'
    ]) {
        assert.equal(run(p).stdout, '', `reminded on: ${p.slice(0, 30)}`);
    }
    for (const input of ['Do it', '<command-name>/code-review</command-name>', { raw: 'not json' }]) {
        assert.match(run(input).stdout, /Before starting/, `no reminder on ${JSON.stringify(input)}`);
    }
});

test('a request that only quotes a tag late in the text still gets the reminder', () => {
    const long = 'Please look at this log. ' + 'x'.repeat(400) + ' <task-notification>';
    assert.match(run(long).stdout, /Before starting/);
});

test('systematic-debugging is offered for a bug, not chained after every plan', () => {
    const out = run('x').stdout;
    assert.match(out, /systematic-debugging/);
    assert.doesNotMatch(out, /->\s*systematic-debugging/, 'reads as a step every hard task goes through');
});
