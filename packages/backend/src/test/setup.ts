import { config } from '../config/app-config';

// Set test environment
process.env.NODE_ENV = 'test';

// Define mock type
type MockPrismaClient = {
  kitchen: Record<string, jest.Mock>;
  kitchenConfiguration: Record<string, jest.Mock>;
  kitchenItem: Record<string, jest.Mock>;
  user: Record<string, jest.Mock>;
  project: Record<string, jest.Mock>;
  role: Record<string, jest.Mock>;
  permission: Record<string, jest.Mock>;
  auditLog: Record<string, jest.Mock>;
  catalogProduct: Record<string, jest.Mock>;
  $transaction: jest.Mock;
  $disconnect: jest.Mock;
};

// Mock Prisma Client instance - declared first
export const mockPrismaClient: MockPrismaClient = {
  kitchen: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  kitchenConfiguration: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    create: jest.fn(),
  },
  kitchenItem: {
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  permission: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  auditLog: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  catalogProduct: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((callback: (client: MockPrismaClient) => unknown) =>
    callback(mockPrismaClient)
  ),
  $disconnect: jest.fn(),
};

// Mock Prisma Client - must be after mockPrismaClient is defined
jest.mock('../database/client', () => ({
  prisma: mockPrismaClient,
  connectPrisma: jest.fn(),
  disconnectPrisma: jest.fn(),
}));

// Mock console methods to reduce noise in tests
beforeAll(() => {
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Global test timeout
jest.setTimeout(10000);

// Export config for tests
export { config };
