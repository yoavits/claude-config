#!/usr/bin/env node
/*
 * Merge this repo's hooks into a Claude Code settings.json without touching
 * anything else in it.
 *
 *   node scripts/merge-settings.js <settings.json> <event> <hook-command> [<event> <hook-command> ...]
 *
 * An event may carry a tool matcher after a colon: `PostToolUse:Bash`. The
 * pseudo-event `permissions.ask` adds a permission rule to the ask list
 * instead, once; the user's own rules are kept. The pseudo-event
 * `unhook:<event>` removes the entry an earlier install added on that event
 * (found by the script name it runs); the user's own hooks are kept.
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

function addAsk(settings, rule) {
    const out = settings && typeof settings === 'object' ? settings : {};
    out.permissions = out.permissions && typeof out.permissions === 'object' ? out.permissions : {};
    const ask = Array.isArray(out.permissions.ask) ? out.permissions.ask : [];
    if (!ask.includes(rule)) ask.push(rule);
    out.permissions.ask = ask;
    return out;
}

// Remove a rule an earlier install added to the ask list; the user's own rules stay.
function removeAsk(settings, rule) {
    const out = settings && typeof settings === 'object' ? settings : {};
    const ask = out.permissions && Array.isArray(out.permissions.ask) ? out.permissions.ask : null;
    if (!ask) return out;
    out.permissions.ask = ask.filter((r) => r !== rule);
    if (out.permissions.ask.length === 0) delete out.permissions.ask;
    return out;
}

// Remove a hook an earlier install added (found by the script it runs); the user's own hooks stay.
function unhook(settings, event, marker) {
    const out = settings && typeof settings === 'object' ? settings : {};
    const entries = out.hooks && Array.isArray(out.hooks[event]) ? out.hooks[event] : null;
    if (!entries) return out;
    out.hooks[event] = entries.filter((e) => !(Array.isArray(e && e.hooks) && e.hooks.some((h) => String(h.command || '').includes(marker))));
    if (out.hooks[event].length === 0) delete out.hooks[event];
    return out;
}

module.exports = { merge, addAsk, removeAsk, unhook, MARKERS };

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
        if (pairs[i] === 'permissions.ask') {
            current = addAsk(current, pairs[i + 1]);
            continue;
        }
        if (pairs[i] === 'permissions.unask') {
            current = removeAsk(current, pairs[i + 1]);
            continue;
        }
        if (pairs[i].startsWith('unhook:')) {
            current = unhook(current, pairs[i].slice('unhook:'.length), pairs[i + 1]);
            continue;
        }
        // The self-update fetches over the network: give it longer.
        current = merge(current, pairs[i], pairs[i + 1], pairs[i] === 'SessionStart' ? 30 : 10);
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
}
