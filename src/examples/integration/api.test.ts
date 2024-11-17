import { test, expect } from 'advanced-testing-framework';

// Testing API endpoints
test('should fetch user data', async () => {
  const response = await fetch('/api/users/1');
  const data = await response.json();
  
  expect(data.id).toBe(1);
  expect(data.name).toBeDefined();
}); 