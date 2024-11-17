import { test, expect } from '../utils/testUtils';

test('basic addition', async () => {
  expect(1 + 1).toBe(2);
});

test('async operation', async () => {
  const result = await Promise.resolve(42);
  expect(result).toBe(42);
});

test.skip('skipped test', async () => {
  // This test will be skipped
});

test('test with tags', async () => {
  expect(true).toBe(true);
}, { tags: ['unit', 'core'] }); 