import { test, expect } from '../utils/testUtils';
import { api } from '../utils/apiUtils';

test('API GET request', async () => {
  const response = await api.get('https://api.example.com/data');
  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
});

test('API POST request', async () => {
  const data = { name: 'Test User' };
  const response = await api.post('https://api.example.com/users', data);
  expect(response.status).toBe(201);
  expect(response.data.id).toBeDefined();
}); 