/**
 * Blindspot — Reporting and Analytics Utilities Tests
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { csvSafe, getDateRange, generatePublicReference, paginateResults } from '../src/utils/index.js';

test('Reports — csvSafe escapes commas, quotes, and newlines', () => {
  assert.equal(csvSafe('Normal Text'), 'Normal Text');
  assert.equal(csvSafe('Hello, World'), '"Hello, World"');
  assert.equal(csvSafe('She said "Hello"'), '"She said ""Hello"""');
  assert.equal(csvSafe("Line 1\nLine 2"), '"Line 1\nLine 2"');
});

test('Reports — csvSafe sanitizes formula injection vulnerabilities (=, +, -, @)', () => {
  assert.equal(csvSafe('=SUM(A1:A10)'), "'=SUM(A1:A10)");
  assert.equal(csvSafe('+12345'), "'+12345");
  assert.equal(csvSafe('-500'), "'-500");
  assert.equal(csvSafe('@sum(A1:A10)'), "'@sum(A1:A10)");
});

test('Reports — getDateRange calculates week and month boundaries', () => {
  const thisWeek = getDateRange('this_week');
  assert.ok(thisWeek.start instanceof Date);
  assert.ok(thisWeek.end instanceof Date);
  assert.ok(thisWeek.end > thisWeek.start);

  const thisMonth = getDateRange('this_month');
  assert.equal(thisMonth.start.getDate(), 1);
  assert.ok(thisMonth.end > thisMonth.start);

  const customRange = getDateRange('custom', '2026-01-01', '2026-01-15');
  assert.equal(customRange.start.toISOString().slice(0, 10), '2026-01-01');
  assert.equal(customRange.end.toISOString().slice(0, 10), '2026-01-15');
});

test('Reports — generatePublicReference creates valid formatted references', () => {
  const ref = generatePublicReference();
  assert.match(ref, /^BS-\d{8}-[A-Z0-9]{4}$/);
});

test('Reports — paginateResults slices correctly and provides accurate metadata', () => {
  const items = Array.from({ length: 45 }, (_, i) => ({ id: i + 1 }));

  const page1 = paginateResults(items, 1, 10);
  assert.equal(page1.data.length, 10);
  assert.equal(page1.pagination.total, 45);
  assert.equal(page1.pagination.totalPages, 5);
  assert.equal(page1.pagination.hasNext, true);
  assert.equal(page1.pagination.hasPrev, false);

  const page5 = paginateResults(items, 5, 10);
  assert.equal(page5.data.length, 5);
  assert.equal(page5.pagination.hasNext, false);
  assert.equal(page5.pagination.hasPrev, true);
});
