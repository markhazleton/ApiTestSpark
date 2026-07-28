/**
 * Standalone validation script for joinUrl (src/utils/urlUtils.ts).
 *
 * Per Constitution VII, the React SPA has no JS/TS test framework and none
 * may be added without amendment. This script uses only Node's built-in
 * `node:assert/strict` and is run manually — it is NOT wired into
 * package.json's `test` script or the CI pipeline.
 *
 * Run with: node scripts/test/validate-joinUrl.ts
 */

import assert from 'node:assert/strict';
import { joinUrl } from '../../src/utils/urlUtils.ts';

interface Case {
  name: string;
  base: string;
  path: string;
  expected: string;
}

const cases: Case[] = [
  // The reported bug: trailing slash on domain + leading slash on route.
  { name: 'trailing slash + leading slash', base: 'https://mydomain.com/', path: '/status', expected: 'https://mydomain.com/status' },
  { name: 'no trailing slash + leading slash', base: 'https://mydomain.com', path: '/status', expected: 'https://mydomain.com/status' },
  { name: 'trailing slash + no leading slash', base: 'https://mydomain.com/', path: 'status', expected: 'https://mydomain.com/status' },
  { name: 'no trailing slash + no leading slash', base: 'https://mydomain.com', path: 'status', expected: 'https://mydomain.com/status' },
  { name: 'multiple trailing + multiple leading slashes', base: 'https://mydomain.com///', path: '///status', expected: 'https://mydomain.com/status' },
  { name: 'base with port + trailing slash', base: 'https://mydomain.com:8080/', path: '/status', expected: 'https://mydomain.com:8080/status' },
  { name: 'nested path segments', base: 'https://mydomain.com/api/', path: '/v1/status', expected: 'https://mydomain.com/api/v1/status' },
  { name: 'path with query string', base: 'https://mydomain.com/', path: '/status?foo=bar', expected: 'https://mydomain.com/status?foo=bar' },
  { name: 'path with hash fragment', base: 'https://mydomain.com', path: '/status#section', expected: 'https://mydomain.com/status#section' },
  { name: 'empty path returns base unchanged', base: 'https://mydomain.com/', path: '', expected: 'https://mydomain.com' },
  { name: 'root path alone', base: 'https://mydomain.com', path: '/', expected: 'https://mydomain.com' },
  { name: 'empty base returns path unchanged', base: '', path: '/status', expected: '/status' },
  { name: 'both empty falls back to root', base: '', path: '', expected: '/' },
  { name: 'base with trailing whitespace-free path only slash', base: 'https://mydomain.com/', path: '/', expected: 'https://mydomain.com' },
  { name: 'localhost with explicit port, no scheme change', base: 'http://localhost:5000/', path: '/api/status', expected: 'http://localhost:5000/api/status' },
];

let failures = 0;

for (const { name, base, path, expected } of cases) {
  const actual = joinUrl(base, path);
  try {
    assert.equal(actual, expected);
    console.log(`PASS: ${name}`);
  } catch {
    failures++;
    console.error(`FAIL: ${name}\n  base=${JSON.stringify(base)} path=${JSON.stringify(path)}\n  expected=${JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures}/${cases.length} case(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${cases.length} case(s) passed.`);
}
