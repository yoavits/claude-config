#!/usr/bin/env node
/*
 * Merge this repo's hooks into a Claude Code settings.json without touching
 * anything else in it.
 *
 *   node scripts/merge-settings.js <settings.json> <event> <hook-command> [<event> <hook-command> ...]
 *
 * An event may carry a tool matcher after a colon: `PostToolUse:Bash`.
 *
 * Idempotent: each of our entries is found by the script name it runs and
 * replaced in place, so a second install never adds a second copy. Every other
 * key, and every other hook on every event, is left as it was. A file that does
 * not exist is created; a file that does not parse is refused (exit 2) rather
 * than overwritten, because it is the user's.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// The script each of our hooks runs, which is how an install finds its own
// entry again. Commands not naming one of these are someone else's.
const MARKERS = ['prompt-reminder.js', 'self-update.sh', 'push-reminder.js'];

function markerOf(command) {
    return MARKERS.find((m) => String(command || '').includes(m));
}

function merge(settings, eventSpec, command, timeout = 10) {
    const [event, matcher] = String(eventSpec).split(':');
    const out = settings && typeof settings === 'object' ? settings : {};
    out.hooks = out.hooks && typeof out.hooks === 'object' ? out.hooks : {};
    const marker = markerOf(command);
    if (!marker) throw new Error(`not one of ours: ${command}`);
    const entries = Array.isArray(out.hooks[event]) ? out.hooks[event] : [];
    const isOurs = (e) => Array.isArray(e && e.hooks) && e.hooks.some((h) => String(h.command || '').includes(marker));
    const kept = entries.filter((e) => !isOurs(e));
    const entry = { hooks: [{ type: 'command', command, timeout }] };
    out.hooks[event] = [...kept, matcher ? { matcher, ...entry } : entry];
    return out;
}

module.exports = { merge, MARKERS };

if (require.main === module) {
    const [file, ...pairs] = process.argv.slice(2);
    if (!file || pairs.length === 0 || pairs.length % 2 !== 0) {
        console.error('usage: merge-settings.js <settings.json> <event> <hook-command> [<event> <hook-command> ...]');
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
    for (let i = 0; i < pairs.length; i += 2) {
        // The self-update fetches over the network: give it longer.
        current = merge(current, pairs[i], pairs[i + 1], pairs[i] === 'SessionStart' ? 30 : 10);
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
}
