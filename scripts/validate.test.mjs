// Run: npm test
// Checks the form rules in lib/validate.ts. This Node version can't import TypeScript, so the rules and the helper they
// use are compiled to a temp folder first.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-'));
for (const name of ['validate', 'utils']) {
  const source = fs.readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  fs.writeFileSync(path.join(dir, `${name}.mjs`), outputText.replace("from './utils'", "from './utils.mjs'"));
}
const { CLAIM_RULES: C, LISTING_RULES: L, REVIEW_RULES: R, cityRule, websiteUrl } = await import(pathToFileURL(path.join(dir, 'validate.mjs')).href);

const ok = (rule, values) => values.forEach(v => assert.equal(rule(v), '', `should accept ${JSON.stringify(v)}`));
const bad = (rule, values) => values.forEach(v => assert.notEqual(rule(v), '', `should reject ${JSON.stringify(v)}`));

test('emails', () => {
  ok(L.email, ['name@example.com', 'first.last+tag@sub.domain.co.in', 'a_b@x-y.io']);
  bad(L.email, ['', 'abc', 'abc@', '@x.com', 'a@b', 'a@b.c', 'a b@x.com', 'a@b..com']);
});

test('phone numbers', () => {
  ok(C.phone, ['+91 98765 43210', '(212) 555-0100', '020 7946 0958', '9876543210', '+1.212.555.0100']);
  bad(C.phone, ['', '12345', 'abc1234567', '+91 98765 43210 1234567', '98765-ext-1', '++911234567']);
  ok(L.phone, ['']); // optional when adding a business
});

test('websites', () => {
  ok(L.website, ['example.com', 'https://example.com/menu', 'http://www.cafe.co.in', 'münchen.de']);
  bad(L.website, ['not a site', 'example', 'ftp://example.com', 'javascript:alert(1)', 'http://localhost']);
  assert.equal(websiteUrl('example.com'), 'https://example.com/');
});

test('names, addresses and reviews', () => {
  ok(C.contact_name, ['José', 'Mary-Jane O’Neil', 'R. K. Sharma', 'राहुल शर्मा', 'Lê Văn Tám']);
  bad(C.contact_name, ['', 'J', 'John2', '@john', 'http://spam.com', '123']);
  ok(L.name, ['7-Eleven', 'Café 21']);
  bad(L.name, ['24/7', 'A']);
  ok(L.address, ['1 Test Street']);
  bad(L.address, ['12', '12345']);
  ok(R.text, ['x'.repeat(50)]);
  assert.match(R.text('x'.repeat(30)), /20 more/);
  bad(R.text, ['x'.repeat(5001)]);
});

test('cities: one we cover, with the country when the name is shared', () => {
  const city = cityRule([{ name: 'Valencia', country: 'Spain' }, { name: 'Valencia', country: 'Venezuela' }, { name: 'São Paulo', country: 'Brazil' }]);
  ok(city, ['Valencia, Spain', 'sao paulo']);
  bad(city, ['Valencia', 'Atlantis', '']);
});
