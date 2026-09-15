#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next']);
const TEXT_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.md', '.css', '.scss', '.html', '.py', '.go', '.rs', '.java', '.rb', '.php', '.sh', '.yml', '.yaml']);

function help() {
  console.log(`Usage: todo-expiry [path ...] [--today YYYY-MM-DD]\n\nFinds TODO/FIXME comments with dates like TODO[2026-01-31] or FIXME due: 2026-01-31 and fails when they are expired.`);
}

function parseArgs(argv) {
  const args = { paths: [], today: new Date().toISOString().slice(0, 10) };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--today') args.today = argv[++i];
    else args.paths.push(arg);
  }
  if (args.paths.length === 0) args.paths.push('.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.today)) throw new Error('--today must be YYYY-MM-DD');
  return args;
}

async function* files(input) {
  const info = await stat(input).catch(() => null);
  if (!info) return;
  if (info.isFile()) {
    yield input;
    return;
  }
  if (!info.isDirectory()) return;
  for (const entry of await readdir(input, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const child = path.join(input, entry.name);
    if (entry.isDirectory()) yield* files(child);
    else if (entry.isFile() && TEXT_EXTS.has(path.extname(entry.name))) yield child;
  }
}

function expiredTodos(text, file, today) {
  const hits = [];
  const datePattern = /\b(?:TODO|FIXME)\b(?:\[[^\]]*?(\d{4}-\d{2}-\d{2})[^\]]*?\]|[^\n]*(?:due|by|expires?|until)\s*:?\s*(\d{4}-\d{2}-\d{2}))/gi;
  text.split(/\r?\n/).forEach((line, index) => {
    for (const match of line.matchAll(datePattern)) {
      const date = match[1] || match[2];
      if (date < today) hits.push({ file, line: index + 1, date, text: line.trim() });
    }
  });
  return hits;
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { help(); process.exit(0); }
  const hits = [];
  for (const input of args.paths) {
    for await (const file of files(path.resolve(input))) {
      const text = await readFile(file, 'utf8').catch(() => '');
      hits.push(...expiredTodos(text, path.relative(process.cwd(), file) || file, args.today));
    }
  }
  if (hits.length) {
    for (const hit of hits) console.error(`${hit.file}:${hit.line} expired ${hit.date} ${hit.text}`);
    process.exit(1);
  }
  console.log('todo-expiry: no expired TODO/FIXME dates');
} catch (error) {
  console.error(`todo-expiry: ${error.message}`);
  process.exit(1);
}
