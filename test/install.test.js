'use strict';

// install.sh, run for real into a scratch home: what lands, what survives, and
// that a second run changes nothing.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

function install(home, extraEnv = {}) {
    const env = { ...process.env, HOME: home, ...extraEnv };
    delete env.CLAUDE_CONFIG_DIR;
    Object.assign(env, extraEnv);
    const r = spawnSync('bash', [path.join(ROOT, 'install.sh')], { env, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return r;
}

function scratch() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-'));
}

function skillsIn(dir) {
    return fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'SKILL.md')));
}

test('installs CLAUDE.md, every skill, the hook and its settings', () => {
    const home = scratch();
    install(home);
    const dest = path.join(home, '.claude');
    assert.equal(
        fs.readFileSync(path.join(dest, 'CLAUDE.md'), 'utf8'),
        fs.readFileSync(path.join(ROOT, 'home', 'CLAUDE.md'), 'utf8')
    );
    const expected = [...skillsIn(path.join(ROOT, '.agents', 'skills')), ...skillsIn(path.join(ROOT, 'home', 'skills'))];
    assert.ok(expected.length >= 11, `only ${expected.length} skills in the repo`);
    for (const s of expected) assert.ok(fs.existsSync(path.join(dest, 'skills', s, 'SKILL.md')), `${s} not installed`);
    assert.ok(!fs.existsSync(path.join(dest, 'hooks', 'prompt-reminder.js')));
    assert.ok(fs.existsSync(path.join(dest, 'hooks', 'push-reminder.js')));
    const settings = JSON.parse(fs.readFileSync(path.join(dest, 'settings.json'), 'utf8'));
    assert.equal(settings.hooks.UserPromptSubmit, undefined);
    const post = settings.hooks.PostToolUse;
    assert.deepEqual(
        post.map((e) => [e.matcher, e.hooks.map((h) => h.command)]),
        [['Bash', ['node "$HOME/.claude/hooks/push-reminder.js"']]]
    );
    const start = settings.hooks.SessionStart.flatMap((e) => e.hooks.map((h) => h.command));
    // install.sh writes bash's view of the path: /d/a/... on Windows, not D:\\a\\...
    const root = spawnSync('bash', ['-c', 'cd "$1" && pwd', '_', ROOT], { encoding: 'utf8' }).stdout.trim();
    assert.deepEqual(start, [`bash "${root}/scripts/self-update.sh"`]);
});

test('Firecrawl no longer asks: the ask rules an earlier install added are removed, the user’s own kept', () => {
    // The owner approves every action in advance; only questions and plans go to them.
    const home = scratch();
    const dest = path.join(home, '.claude');
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'settings.json'), JSON.stringify({
        permissions: { ask: ['mcp__Firecrawl__*', 'Bash(rm *)', 'mcp__firecrawl__*'] },
    }));
    install(home);
    const settings = JSON.parse(fs.readFileSync(path.join(dest, 'settings.json'), 'utf8'));
    assert.deepEqual(settings.permissions.ask, ['Bash(rm *)']);

    const fresh = scratch();
    install(fresh);
    const plain = JSON.parse(fs.readFileSync(path.join(fresh, '.claude', 'settings.json'), 'utf8'));
    assert.equal(plain.permissions && plain.permissions.ask, undefined);
});

test('keeps the user’s own settings, hooks, skills and CLAUDE.md', () => {
    const home = scratch();
    const dest = path.join(home, '.claude');
    fs.mkdirSync(path.join(dest, 'skills', 'my-own-skill'), { recursive: true });
    fs.writeFileSync(path.join(dest, 'skills', 'my-own-skill', 'SKILL.md'), '---\nname: my-own-skill\n---\n');
    fs.writeFileSync(path.join(dest, 'CLAUDE.md'), '# my notes\n');
    fs.writeFileSync(
        path.join(dest, 'settings.json'),
        JSON.stringify({
            theme: 'dark',
            permissions: { allow: ['Bash(ls *)'] },
            hooks: {
                UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'echo mine' }] }],
                PostToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'prettier' }] }]
            }
        })
    );
    install(home);
    const settings = JSON.parse(fs.readFileSync(path.join(dest, 'settings.json'), 'utf8'));
    assert.equal(settings.theme, 'dark');
    assert.deepEqual(settings.permissions.allow, ['Bash(ls *)'], 'their allow rules changed');
    assert.equal(settings.hooks.PostToolUse[0].hooks[0].command, 'prettier');
    const cmds = settings.hooks.UserPromptSubmit.flatMap((e) => e.hooks.map((h) => h.command));
    assert.deepEqual(cmds, ['echo mine']);
    assert.ok(fs.existsSync(path.join(dest, 'skills', 'my-own-skill', 'SKILL.md')), 'a skill of theirs was removed');
    assert.equal(fs.readFileSync(path.join(dest, 'CLAUDE.md.before-claude-config'), 'utf8'), '# my notes\n');
});

test('the prompt reminder is gone: an earlier install’s hook and script are removed, the user’s own kept', () => {
    // The owner found it noise on every prompt (2026-10-31).
    const home = scratch();
    const dest = path.join(home, '.claude');
    fs.mkdirSync(path.join(dest, 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(dest, 'hooks', 'prompt-reminder.js'), '// old\n');
    fs.writeFileSync(
        path.join(dest, 'settings.json'),
        JSON.stringify({
            hooks: {
                UserPromptSubmit: [
                    { hooks: [{ type: 'command', command: 'echo mine' }] },
                    { hooks: [{ type: 'command', command: 'node "$HOME/.claude/hooks/prompt-reminder.js"', timeout: 10 }] }
                ]
            }
        })
    );
    install(home);
    const settings = JSON.parse(fs.readFileSync(path.join(dest, 'settings.json'), 'utf8'));
    const cmds = settings.hooks.UserPromptSubmit.flatMap((e) => e.hooks.map((h) => h.command));
    assert.deepEqual(cmds, ['echo mine']);
    assert.ok(!fs.existsSync(path.join(dest, 'hooks', 'prompt-reminder.js')));
});

test('a second install changes nothing', () => {
    const home = scratch();
    install(home);
    const dest = path.join(home, '.claude');
    const snapshot = (p) => fs.readFileSync(path.join(dest, p), 'utf8');
    const before = { settings: snapshot('settings.json'), claude: snapshot('CLAUDE.md') };
    install(home);
    assert.equal(snapshot('settings.json'), before.settings, 'settings changed on a re-run (a duplicate hook?)');
    assert.equal(snapshot('CLAUDE.md'), before.claude);
    assert.ok(!fs.existsSync(path.join(dest, 'CLAUDE.md.before-claude-config')), 'our own CLAUDE.md was backed up as if it were theirs');
});

test('refuses to overwrite a settings.json that does not parse', () => {
    const home = scratch();
    const dest = path.join(home, '.claude');
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'settings.json'), '{ not json');
    const env = { ...process.env, HOME: home };
    delete env.CLAUDE_CONFIG_DIR;
    const r = spawnSync('bash', [path.join(ROOT, 'install.sh')], { env, encoding: 'utf8' });
    assert.notEqual(r.status, 0);
    assert.equal(fs.readFileSync(path.join(dest, 'settings.json'), 'utf8'), '{ not json');
});

test('honours CLAUDE_CONFIG_DIR, with an absolute hook path', () => {
    const home = scratch();
    const custom = path.join(home, 'elsewhere');
    install(home, { CLAUDE_CONFIG_DIR: custom });
    const settings = JSON.parse(fs.readFileSync(path.join(custom, 'settings.json'), 'utf8'));
    assert.equal(settings.hooks.PostToolUse[0].hooks[0].command, `node "${custom}/hooks/push-reminder.js"`);
    assert.ok(!fs.existsSync(path.join(home, '.claude')));
});

test('with the superpowers plugin on, its vendored copies are skipped and earlier copies removed', () => {
    // Both copies listed every skill twice in every session; the plugin's were the ones used.
    const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'skills-lock.json'), 'utf8')).skills;
    const ours = Object.keys(lock).filter((s) => lock[s].source === 'obra/superpowers');
    const others = Object.keys(lock).filter((s) => lock[s].source !== 'obra/superpowers');
    assert.ok(ours.length >= 5 && others.length >= 1);

    const home = scratch();
    install(home);
    const dest = path.join(home, '.claude');
    for (const s of ours) assert.ok(fs.existsSync(path.join(dest, 'skills', s, 'SKILL.md')), `${s} missing without the plugin`);

    const settingsPath = path.join(dest, 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    settings.enabledPlugins = { 'superpowers@claude-plugins-official': true };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    fs.mkdirSync(path.join(dest, 'skills', 'my-own-skill'), { recursive: true });
    fs.writeFileSync(path.join(dest, 'skills', 'my-own-skill', 'SKILL.md'), '---\nname: my-own-skill\n---\n');
    install(home);
    for (const s of ours) assert.ok(!fs.existsSync(path.join(dest, 'skills', s)), `${s} still installed beside the plugin`);
    for (const s of others) assert.ok(fs.existsSync(path.join(dest, 'skills', s, 'SKILL.md')), `${s} was removed`);
    assert.ok(fs.existsSync(path.join(dest, 'skills', 'my-own-skill', 'SKILL.md')), 'a skill of theirs was removed');

    settings.enabledPlugins['superpowers@claude-plugins-official'] = false;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    install(home);
    for (const s of ours) assert.ok(fs.existsSync(path.join(dest, 'skills', s, 'SKILL.md')), `${s} not back with the plugin off`);
});
