import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const cli = path.resolve('bin/todo-expiry.js');

async function fixture(text) {
  const dir = await mkdtemp(path.join(tmpdir(), 'todo-expiry-'));
  await writeFile(path.join(dir, 'sample.js'), text);
  return dir;
}

test('prints help', () => {
  const result = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: todo-expiry/);
});

test('passes when dated todo is not expired', async () => {
  const dir = await fixture('// TODO[2099-01-01] later\n');
  const result = spawnSync(process.execPath, [cli, '.', '--today', '2026-01-01'], { cwd: dir, encoding: 'utf8' });
  assert.equal(result.status, 0);
});

test('fails when dated todo is expired', async () => {
  const dir = await fixture('// FIXME due: 2020-01-01 remove hack\n');
  const result = spawnSync(process.execPath, [cli, '.', '--today', '2026-01-01'], { cwd: dir, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /sample\.js:1 expired 2020-01-01/);
});
