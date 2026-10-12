'use strict';

// The SessionStart self-update, run for real: a scratch "origin" with this repo's
// files, a clone of it installed into a scratch home, then a commit pushed to
// origin. The next session start must install that commit once, and say so;
// the one after must change nothing and say nothing.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const GIT_ENV = {
    GIT_AUTHOR_NAME: 't',
    GIT_AUTHOR_EMAIL: 't@example.com',
    GIT_COMMITTER_NAME: 't',
    GIT_COMMITTER_EMAIL: 't@example.com'
};

// The path as install.sh writes it: bash's own view of the directory, which on
// Windows is /d/a/... rather than D:\\a\\...
function bashPath(dir) {
    return sh('bash', ['-c', 'cd "$1" && pwd', '_', dir]).trim();
}

function sh(cmd, args, opts = {}) {
    const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts, env: { ...process.env, ...GIT_ENV, ...(opts.env || {}) } });
    assert.equal(r.status, 0, `${cmd} ${args.join(' ')}\n${r.stderr}`);
    return r.stdout;
}

function updateRun(env = {}) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-update-'));
    const origin = path.join(tmp, 'origin');
    const clone = path.join(tmp, 'clone');
    const home = path.join(tmp, 'home');
    fs.mkdirSync(home);

    fs.cpSync(ROOT, origin, {
        recursive: true,
        filter: (src) => !/[\\/](\.git|node_modules)([\\/]|$)/.test(path.relative(ROOT, src) ? '/' + path.relative(ROOT, src) : '')
    });
    sh('git', ['init', '-q', '-b', 'main'], { cwd: origin });
    sh('git', ['add', '-A'], { cwd: origin });
    sh('git', ['commit', '-q', '-m', 'base'], { cwd: origin });
    sh('git', ['clone', '-q', origin, clone]);

    delete process.env.CLAUDE_CONFIG_DIR;
    sh('bash', [path.join(clone, 'install.sh')], { env: { HOME: home } });

    const settings = JSON.parse(fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf8'));
    const start = settings.hooks.SessionStart.flatMap((e) => e.hooks.map((h) => h.command));
    assert.deepEqual(start, [`bash "${bashPath(clone)}/scripts/self-update.sh"`]);

    const update = () => sh('bash', [path.join(clone, 'scripts', 'self-update.sh')], { env: { HOME: home, ...env } });
    assert.equal(update(), '', 'nothing new upstream, so nothing to say');

    fs.appendFileSync(path.join(origin, 'home', 'CLAUDE.md'), '\nMARKER-FROM-UPSTREAM\n');
    sh('git', ['commit', '-q', '-am', 'upstream change'], { cwd: origin });

    const said = update();
    assert.match(said, /claude-config updated to .*upstream change/);
    assert.match(fs.readFileSync(path.join(home, '.claude', 'CLAUDE.md'), 'utf8'), /MARKER-FROM-UPSTREAM/);
    assert.equal(update(), '', 'a second start with nothing new says nothing');
}

test('a pushed change reaches the next session, once', () => updateRun());

test('it updates without a timeout command, as on macOS', () => {
    // macOS ships no timeout(1). A stub that fails the way a missing command does
    // (127) stands in for it, ahead of the real one on PATH.
    const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-bin-'));
    fs.writeFileSync(path.join(bin, 'timeout'), '#!/bin/sh\nexit 127\n', { mode: 0o755 });
    updateRun({ PATH: bin + path.delimiter + process.env.PATH });
});

test('the self-update never fails a session', () => {
    // No network, no repo, a broken clone: every one of these exits 0 and stays quiet.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-update-'));
    fs.mkdirSync(path.join(tmp, 'scripts'));
    fs.copyFileSync(path.join(ROOT, 'scripts', 'self-update.sh'), path.join(tmp, 'scripts', 'self-update.sh'));
    const r = spawnSync('bash', [path.join(tmp, 'scripts', 'self-update.sh')], { encoding: 'utf8' });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
});
