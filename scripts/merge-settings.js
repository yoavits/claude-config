#!/usr/bin/env node
/*
 * Merge this repo's hooks into a Claude Code settings.json without touching
 * anything else in it.
 *
 *   node scripts/merge-settings.js <settings.json> <hook-command>
 *
 * Idempotent: the reminder's entry is found by the script name it runs and
 * replaced in place, so a second install never adds a second reminder. Every
 * other key, and every other hook on every event, is left as it was. A file
 * that does not exist is created; a file that does not parse is refused
 * (exit 2) rather than overwritten, because it is the user's.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'prompt-reminder.js';

function merge(settings, command) {
    const out = settings && typeof settings === 'object' ? settings : {};
    out.hooks = out.hooks && typeof out.hooks === 'object' ? out.hooks : {};
    const entries = Array.isArray(out.hooks.UserPromptSubmit) ? out.hooks.UserPromptSubmit : [];
    const ours = { hooks: [{ type: 'command', command, timeout: 10 }] };
    const isOurs = (e) => Array.isArray(e && e.hooks) && e.hooks.some((h) => String(h.command || '').includes(MARKER));
    const kept = entries.filter((e) => !isOurs(e));
    out.hooks.UserPromptSubmit = [...kept, ours];
    return out;
}

module.exports = { merge, MARKER };

if (require.main === module) {
    const [file, command] = process.argv.slice(2);
    if (!file || !command) {
        console.error('usage: merge-settings.js <settings.json> <hook-command>');
        process.exit(64);
    }
    let current = {};
    if (fs.existsSync(file)) {
        const text = fs.readFileSync(file, 'utf8');
        if (text.trim()) {
            try {
                current = JSON.parse(text);
            } catch (err) {
                console.error(`refusing to overwrite ${file}: it is not valid JSON (${err.message})`);
                process.exit(2);
            }
        }
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(merge(current, command), null, 2) + '\n');
}
