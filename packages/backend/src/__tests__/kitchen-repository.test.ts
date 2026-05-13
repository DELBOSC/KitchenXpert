/**
 * Kitchen Repository Tests
 */

import { KitchenRepository } from '../repositories/kitchen-repository';
import { mockPrismaClient } from '../test/setup';

describe('KitchenRepository', () => {
  let repository: KitchenRepository;

  beforeEach(() => {
    repository = new KitchenRepository(mockPrismaClient as any);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find a kitchen by ID', async () => {
      const mockKitchen = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Kitchen',
        projectId: 'project-1',
        userId: 'user-1',
        style: 'modern',
        layout: 'l_shaped',
        width: 400,
        length: 300,
        height: 250,
        deletedAt: null,
      };

      mockPrismaClient.kitchen.findUnique.mockResolvedValue(mockKitchen);

      const result = await repository.findById('550e8400-e29b-41d4-a716-446655440000');

      expect(mockPrismaClient.kitchen.findUnique).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000', deletedAt: null },
        include: undefined,
      });
      expect(result).toEqual(mockKitchen);
    });

    it('should include relations when requested', async () => {
      mockPrismaClient.kitchen.findUnique.mockResolvedValue({});

      await repository.findById('550e8400-e29b-41d4-a716-446655440000', true);

      expect(mockPrismaClient.kitchen.findUnique).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000', deletedAt: null },
        include: {
          configuration: true,
          // Repository now eagerly loads item relations (product/appliance)
          // and a trimmed project projection.
          items: {
            include: { appliance: true, product: true },
            orderBy: { createdAt: 'asc' },
          },
          project: { select: { id: true, name: true, userId: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });
    });

    it('should return null when kitchen not found', async () => {
      mockPrismaClient.kitchen.findUnique.mockResolvedValue(null);

      const result = await repository.findById('00000000-0000-0000-0000-000000000000');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all kitchens with default pagination', async () => {
      const mockKitchens = [
        { id: 'k1', name: 'Kitchen 1' },
        { id: 'k2', name: 'Kitchen 2' },
      ];

      mockPrismaClient.kitchen.findMany.mockResolvedValue(mockKitchens);
      mockPrismaClient.kitchen.count.mockResolvedValue(2);

      const result = await repository.findAll();

      expect(result).toEqual({
        data: mockKitchens,
        total: 2,
        page: 1,
        totalPages: 1,
      });
    });

    it('should apply filters correctly', async () => {
      mockPrismaClient.kitchen.findMany.mockResolvedValue([]);
      mockPrismaClient.kitchen.count.mockResolvedValue(0);

      await repository.findAll({
        userId: 'user-1',
        style: 'modern',
        isGenerated: true,
      });

      expect(mockPrismaClient.kitchen.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            style: 'modern',
            isGenerated: true,
          }),
        })
      );
    });

    it('should handle pagination', async () => {
      mockPrismaClient.kitchen.findMany.mockResolvedValue([]);
      mockPrismaClient.kitchen.count.mockResolvedValue(50);

      const result = await repository.findAll({}, { page: 2, limit: 10 });

      expect(mockPrismaClient.kitchen.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
      expect(result.totalPages).toBe(5);
    });
  });

  describe('create', () => {
    it('should create a new kitchen', async () => {
      const createDto = {
        projectId: 'project-1',
        userId: 'user-1',
        name: 'New Kitchen',
        width: 400,
        length: 300,
      };

      const mockCreated = { id: 'new-id', ...createDto, style: 'modern', layout: 'l_shaped' };
      mockPrismaClient.kitchen.create.mockResolvedValue(mockCreated);

      const result = await repository.create(createDto);

      expect(mockPrismaClient.kitchen.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 'project-1',
          userId: 'user-1',
          name: 'New Kitchen',
          width: 400,
          length: 300,
          style: 'modern',
          layout: 'l_shaped',
        }),
        include: { configuration: true },
      });
      expect(result).toEqual(mockCreated);
    });
  });

  describe('update', () => {
    it('should update a kitchen', async () => {
      const mockUpdated = { id: 'k1', name: 'Updated Kitchen' };
      mockPrismaClient.kitchen.update.mockResolvedValue(mockUpdated);

      const result = await repository.update('k1', { name: 'Updated Kitchen' });

      expect(mockPrismaClient.kitchen.update).toHaveBeenCalledWith({
        where: { id: 'k1' },
        data: expect.objectContaining({ name: 'Updated Kitchen' }),
        include: { configuration: true },
      });
      expect(result).toEqual(mockUpdated);
    });

    it('should only update provided fields', async () => {
      mockPrismaClient.kitchen.update.mockResolvedValue({});

      await repository.update('k1', { name: 'New Name', width: 500 });

      expect(mockPrismaClient.kitchen.update).toHaveBeenCalledWith({
        where: { id: 'k1' },
        data: { name: 'New Name', width: 500 },
        include: { configuration: true },
      });
    });
  });

  describe('delete', () => {
    it('should soft delete a kitchen', async () => {
      mockPrismaClient.kitchen.update.mockResolvedValue({ id: 'k1', deletedAt: new Date() });

      await repository.delete('k1');

      expect(mockPrismaClient.kitchen.update).toHaveBeenCalledWith({
        where: { id: 'k1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete a kitchen', async () => {
      mockPrismaClient.kitchen.delete.mockResolvedValue({ id: 'k1' });

      await repository.hardDelete('k1');

      expect(mockPrismaClient.kitchen.delete).toHaveBeenCalledWith({
        where: { id: 'k1' },
      });
    });
  });

  describe('getConfiguration', () => {
    it('should get kitchen configuration', async () => {
      const mockConfig = { kitchenId: 'k1', wallColor: '#FFFFFF' };
      mockPrismaClient.kitchenConfiguration.findUnique.mockResolvedValue(mockConfig);

      const result = await repository.getConfiguration('k1');

      expect(mockPrismaClient.kitchenConfiguration.findUnique).toHaveBeenCalledWith({
        where: { kitchenId: 'k1' },
      });
      expect(result).toEqual(mockConfig);
    });
  });

  describe('upsertConfiguration', () => {
    it('should upsert kitchen configuration', async () => {
      const mockConfig = { kitchenId: 'k1', wallColor: '#000000' };
      mockPrismaClient.kitchenConfiguration.upsert.mockResolvedValue(mockConfig);

      const result = await repository.upsertConfiguration('k1', { wallColor: '#000000' });

      expect(mockPrismaClient.kitchenConfiguration.upsert).toHaveBeenCalledWith({
        where: { kitchenId: 'k1' },
        create: expect.objectContaining({ kitchenId: 'k1', wallColor: '#000000' }),
        update: { wallColor: '#000000' },
      });
      expect(result).toEqual(mockConfig);
    });
  });

  describe('getItems', () => {
    it('should get all items in a kitchen', async () => {
      const mockItems = [{ id: 'item-1' }, { id: 'item-2' }];
      mockPrismaClient.kitchenItem.findMany.mockResolvedValue(mockItems);

      const result = await repository.getItems('k1');

      expect(mockPrismaClient.kitchenItem.findMany).toHaveBeenCalledWith({
        where: { kitchenId: 'k1' },
        include: { product: true, appliance: true },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(mockItems);
    });
  });

  describe('addItem', () => {
    it('should add an item to a kitchen', async () => {
      const itemData = { type: 'cabinet', name: 'Base Cabinet' };
      const mockItem = { id: 'item-1', kitchenId: 'k1', ...itemData };
      mockPrismaClient.kitchenItem.create.mockResolvedValue(mockItem);

      const result = await repository.addItem('k1', itemData);

      expect(mockPrismaClient.kitchenItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ kitchenId: 'k1', type: 'cabinet' }),
      });
      expect(result).toEqual(mockItem);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from a kitchen', async () => {
      mockPrismaClient.kitchenItem.delete.mockResolvedValue({ id: 'item-1' });

      await repository.removeItem('item-1');

      expect(mockPrismaClient.kitchenItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });
  });

  describe('getUserStats', () => {
    it('should get user statistics', async () => {
      // getUserStats now does ONE Promise.all with two groupBy() calls
      // (by isGenerated + by style) plus aggregate(). The first groupBy
      // returns isGenerated buckets so we derive totals from there.
      mockPrismaClient.kitchen.groupBy
        .mockResolvedValueOnce([
          { isGenerated: false, _count: { _all: 5 } },
          { isGenerated: true, _count: { _all: 5 } },
        ])
        .mockResolvedValueOnce([
          { style: 'modern', _count: { style: 6 } },
          { style: 'traditional', _count: { style: 4 } },
        ]);
      mockPrismaClient.kitchen.aggregate.mockResolvedValue({ _avg: { score: 8.5 } });

      const result = await repository.getUserStats('user-1');

      expect(result).toEqual({
        totalKitchens: 10,
        generatedKitchens: 5,
        averageScore: 8.5,
        styleBreakdown: { modern: 6, traditional: 4 },
      });
    });
  });

  describe('duplicate', () => {
    it('should duplicate a kitchen with all relations', async () => {
      const originalKitchen = {
        id: 'k1',
        projectId: 'p1',
        userId: 'u1',
        name: 'Original Kitchen',
        style: 'modern',
        layout: 'l_shaped',
        width: 400,
        length: 300,
        height: 250,
        metadata: null,
        configuration: { id: 'cfg1', wallColor: '#FFF' },
        items: [{ id: 'item1', type: 'cabinet' }],
      };

      mockPrismaClient.kitchen.findUnique.mockResolvedValue(originalKitchen);
      mockPrismaClient.kitchen.create.mockResolvedValue({ ...originalKitchen, id: 'k2', name: 'Original Kitchen (Copy)' });
      mockPrismaClient.kitchenConfiguration.create.mockResolvedValue({});
      mockPrismaClient.kitchenItem.createMany.mockResolvedValue({ count: 1 });

      const result = await repository.duplicate('k1');

      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
      expect(result.name).toBe('Original Kitchen (Copy)');
    });

    it('should throw error if kitchen not found', async () => {
      mockPrismaClient.kitchen.findUnique.mockResolvedValue(null);

      await expect(repository.duplicate('00000000-0000-0000-0000-000000000000')).rejects.toThrow('Kitchen not found');
    });
  });
});
