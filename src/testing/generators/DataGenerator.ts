import { faker } from '@faker-js/faker';
import { Logger } from '../../utils/Logger';

export class DataGenerator {
  private readonly logger = new Logger('DataGenerator');
  private readonly cache = new Map<string, any[]>();

  constructor(private readonly seed?: number) {
    if (seed) {
      faker.seed(seed);
    }
  }

  user(overrides: Partial<UserData> = {}): UserData {
    return {
      id: faker.string.uuid(),
      username: faker.internet.userName(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      avatar: faker.image.avatar(),
      createdAt: faker.date.past(),
      ...overrides
    };
  }

  users(count: number, overrides: Partial<UserData> = {}): UserData[] {
    return Array.from({ length: count }, () => this.user(overrides));
  }

  product(overrides: Partial<ProductData> = {}): ProductData {
    return {
      id: faker.string.uuid(),
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price()),
      category: faker.commerce.department(),
      images: Array.from({ length: 3 }, () => faker.image.url()),
      stock: faker.number.int({ min: 0, max: 100 }),
      ...overrides
    };
  }

  order(overrides: Partial<OrderData> = {}): OrderData {
    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      items: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
        productId: faker.string.uuid(),
        quantity: faker.number.int({ min: 1, max: 10 }),
        price: parseFloat(faker.commerce.price())
      })),
      status: faker.helpers.arrayElement(['pending', 'processing', 'shipped', 'delivered']),
      shippingAddress: this.address(),
      createdAt: faker.date.past(),
      ...overrides
    };
  }

  address(overrides: Partial<AddressData> = {}): AddressData {
    return {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      country: faker.location.country(),
      zipCode: faker.location.zipCode(),
      ...overrides
    };
  }

  custom<T>(generator: () => T, count: number = 1): T[] {
    return Array.from({ length: count }, generator);
  }

  cached<T>(key: string, generator: () => T, count: number = 1): T[] {
    if (!this.cache.has(key)) {
      this.cache.set(key, this.custom(generator, count));
    }
    return this.cache.get(key)!;
  }

  clearCache(): void {
    this.cache.clear();
  }
} 