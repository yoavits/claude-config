'use strict';

// home/CLAUDE.md loads in every session: what it names must exist, and it must stay short.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

test('every skill the global CLAUDE.md names is shipped', () => {
    const full = fs.readFileSync(path.join(ROOT, 'home', 'CLAUDE.md'), 'utf8');
    // The scout's section logs plugins and skills installed on one machine, not shipped by this repo.
    const md = full.replace(/^## Plugins and skills \(kept by the weekly scout\)[\s\S]*?(?=^## |(?![\s\S]))/m, '');
    assert.ok(md.length < full.length, 'the scout section was not found, so nothing was exempted');
    const NOT_SHIPPED = new Set(['using-git-worktrees', 'finishing-a-development-branch', 'subagent-driven-development']);
    const named = [...md.matchAll(/`([a-z]+(?:-[a-z]+)+)`/g)].map((m) => m[1]).filter((n) => !NOT_SHIPPED.has(n) && !n.endsWith('-reminder'));
    assert.ok(named.length >= 4, `only ${named.length} skill names recognised`);
    const shipped = (s) =>
        fs.existsSync(path.join(ROOT, '.agents', 'skills', s, 'SKILL.md')) || fs.existsSync(path.join(ROOT, 'home', 'skills', s, 'SKILL.md'));
    for (const s of named) assert.ok(shipped(s), `${s} is named in home/CLAUDE.md but not shipped`);
    assert.ok(full.split('\n').length <= 200, 'the global CLAUDE.md loads in every session; keep it short');
});
