import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeCreators } from '../src/features/discover/normalizeCreators.ts';

test('removes repeated creator names while preserving order', () => {
  assert.equal(normalizeCreators(['Han Kang', 'Han Kang']), 'Han Kang');
});

test('keeps up to two distinct creator names', () => {
  assert.equal(normalizeCreators(['A', 'B', 'C']), 'A, B');
});

test('ignores invalid and blank creator values', () => {
  assert.equal(normalizeCreators([' ', null, 'Kim']), 'Kim');
  assert.equal(normalizeCreators(undefined), undefined);
});
