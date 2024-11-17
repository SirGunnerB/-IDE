import { test, expect } from 'advanced-testing-framework';

// Testing end-to-end flows
test('user can login', async () => {
  // Test login flow
  const loginResult = await login('user@example.com', 'password123');
  expect(loginResult.success).toBe(true);
}); 