import { test, expect } from 'advanced-testing-framework';

// Testing a calculator class/functions
test('calculator addition', async () => {
  const result = 2 + 2;
  expect(result).toBe(4);
});

test('calculator multiplication', async () => {
  const result = 3 * 4;
  expect(result).toBe(12);
}); 