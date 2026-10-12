// Run: npm test
// Checks the admin sign-in tokens in lib/session.ts, compiled to a temp folder first (see validate.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../lib/session.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'session-')), 'session.mjs');
fs.writeFileSync(file, outputText);
const { makeToken, validToken, sameText } = await import(pathToFileURL(file).href);

test('admin sign-in tokens', () => {
  const now = Date.now();
  const token = makeToken('key', now + 60_000);
  const [exp, sig] = token.split('.');
  assert.ok(validToken('key', token, now));
  assert.ok(!validToken('key', token, now + 60_000), 'expired');
  assert.ok(!validToken('new key', token, now), 'signed with another key, as after a password change');
  assert.ok(!validToken('key', `${Number(exp) + 86_400_000}.${sig}`, now), 'expiry pushed back');
  assert.ok(!validToken('key', `${exp}.${sig.slice(0, -1)}${sig.endsWith('A') ? 'B' : 'A'}`, now), 'signature changed');
  for (const bad of [undefined, '', '.', 'abc', `${exp}.`, `.${sig}`, `-${exp}.${sig}`, `${exp}.${sig}.x`])
    assert.ok(!validToken('key', bad, now), `rejects ${JSON.stringify(bad)}`);
});

test('constant-time compare', () => {
  assert.ok(sameText('correct horse', 'correct horse'));
  assert.ok(!sameText('correct horse', 'correct horsf'));
  assert.ok(!sameText('', 'x'));
});
