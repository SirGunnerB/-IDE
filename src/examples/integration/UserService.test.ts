import { describe, test, expect, beforeAll, afterAll } from '../../utils/TestUtils';
import { UserService } from '../../services/UserService';
import { DatabaseSetup } from '../../testing/integration/DatabaseSetup';
import { TestData } from '../TestData';

describe('UserService Integration', () => {
  let userService: UserService;
  let dbSetup: DatabaseSetup;

  beforeAll(async () => {
    dbSetup = new DatabaseSetup({
      database: 'test_db',
      migrations: './migrations',
      seeds: './seeds'
    });

    await dbSetup.setup();
    userService = new UserService();
  });

  afterAll(async () => {
    await dbSetup.cleanup();
  });

  describe('createUser', () => {
    test('should create new user', async () => {
      const userData = TestData.generateUser();
      const user = await userService.createUser(userData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
    });

    test('should fail with duplicate email', async () => {
      const userData = TestData.generateUser();
      await userService.createUser(userData);

      await expect(
        userService.createUser(userData)
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('getUserById', () => {
    test('should retrieve existing user', async () => {
      const userData = TestData.generateUser();
      const created = await userService.createUser(userData);
      const retrieved = await userService.getUserById(created.id);

      expect(retrieved).toEqual(created);
    });

    test('should return null for non-existent user', async () => {
      const result = await userService.getUserById('non-existent-id');
      expect(result).toBeNull();
    });
  });
}); 