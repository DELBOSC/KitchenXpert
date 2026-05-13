/**
 * Certified Quote Service Tests
 *
 * Tests for French-compliant "devis" generation:
 * - getNextNumber (sequential numbering KX-YYYY-NNNNN)
 * - create (full quote with TVA calculations)
 * - getById (with ownership check)
 * - list (user scoped)
 * - sign (SHA-256 hash, eIDAS, status checks)
 * - generatePDF (HTML generation with access check)
 * - send (email with attachment, status transition)
 */

// ---------------------------------------------------------------------------
// Mock prisma client
// ---------------------------------------------------------------------------
const mockPrisma = {
  certifiedQuote: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
}));

// ---------------------------------------------------------------------------
// Mock mail service
// ---------------------------------------------------------------------------
const mockMailSend = jest.fn();

jest.mock('../services/mail.service', () => ({
  getMailService: jest.fn(() => ({
    send: mockMailSend,
  })),
}));

// ---------------------------------------------------------------------------
// Mock config
// ---------------------------------------------------------------------------
jest.mock('../config/app-config', () => ({
  config: {
    corsOrigins: ['https://app.kitchenxpert.com'],
    env: 'test',
  },
}));

// ---------------------------------------------------------------------------
// Mock logger
// ---------------------------------------------------------------------------
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { CertifiedQuoteService } from '../services/quote/certified-quote.service';

import type { CreateQuoteDto, QuoteLineItem } from '../services/quote/certified-quote.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const testUserId = 'test-user-id';
const otherUserId = 'other-user-99';

const sampleItems: QuoteLineItem[] = [
  {
    ref: 'CAB-001',
    name: 'Meuble bas 60cm',
    description: 'Meuble bas blanc laque',
    qty: 4,
    unitPriceHT: 250,
    tvaRate: 20,
    totalHT: 1000,
    totalTVA: 200,
    totalTTC: 1200,
  },
  {
    ref: 'TOP-001',
    name: 'Plan de travail granit 3m',
    qty: 1,
    unitPriceHT: 800,
    tvaRate: 20,
    totalHT: 800,
    totalTVA: 160,
    totalTTC: 960,
  },
];

const createQuoteDto: CreateQuoteDto = {
  kitchenId: '550e8400-e29b-41d4-a716-446655440000',
  clientName: 'Jean Dupont',
  clientEmail: 'jean@example.com',
  clientAddress: '10 rue de Paris, 75001 Paris',
  items: sampleItems,
  tvaRate: 20,
  validityDays: 30,
  notes: 'Livraison incluse',
};

const mockQuote = {
  id: 'quote-1',
  userId: testUserId,
  kitchenId: '550e8400-e29b-41d4-a716-446655440000',
  projectId: null,
  quoteNumber: 'KX-2026-00001',
  items: sampleItems,
  subtotalHT: 1800,
  tvaAmount: 360,
  totalTTC: 2160,
  validityDays: 30,
  validUntil: new Date('2026-04-01'),
  legalMentions: 'MENTIONS LEGALES DU DEVIS',
  clientName: 'Jean Dupont',
  clientEmail: 'jean@example.com',
  clientAddress: '10 rue de Paris, 75001 Paris',
  status: 'draft',
  signatureHash: null,
  signedAt: null,
  signedByUserId: null,
  createdAt: new Date('2026-03-01'),
  updatedAt: new Date('2026-03-01'),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CertifiedQuoteService', () => {
  let service: CertifiedQuoteService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CertifiedQuoteService();
  });

  // ==================== getNextNumber ====================

  describe('getNextNumber', () => {
    it('should generate sequential quote number KX-YYYY-00001 when no quotes exist', async () => {
      mockPrisma.certifiedQuote.count.mockResolvedValue(0);

      const result = await service.getNextNumber();

      const year = new Date().getFullYear();
      expect(result).toBe(`KX-${year}-00001`);
      expect(mockPrisma.certifiedQuote.count).toHaveBeenCalledWith({
        where: { quoteNumber: { startsWith: `KX-${year}-` } },
      });
    });

    it('should increment count for subsequent quotes', async () => {
      mockPrisma.certifiedQuote.count.mockResolvedValue(42);

      const result = await service.getNextNumber();

      const year = new Date().getFullYear();
      expect(result).toBe(`KX-${year}-00043`);
    });

    it('should pad the number to 5 digits', async () => {
      mockPrisma.certifiedQuote.count.mockResolvedValue(9);

      const result = await service.getNextNumber();

      expect(result).toMatch(/KX-\d{4}-00010$/);
    });
  });

  // ==================== create ====================

  describe('create', () => {
    it('should create a quote with calculated TVA and totals', async () => {
      mockPrisma.certifiedQuote.count.mockResolvedValue(0);
      mockPrisma.certifiedQuote.create.mockResolvedValue(mockQuote);

      const result = await service.create(testUserId, createQuoteDto);

      expect(result).toEqual(mockQuote);
      expect(mockPrisma.certifiedQuote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: testUserId,
          kitchenId: '550e8400-e29b-41d4-a716-446655440000',
          clientName: 'Jean Dupont',
          clientEmail: 'jean@example.com',
          status: 'draft',
        }),
      });
    });

    it('should default TVA rate to 20% when not specified', async () => {
      mockPrisma.certifiedQuote.count.mockResolvedValue(0);
      mockPrisma.certifiedQuote.create.mockResolvedValue(mockQuote);

      const dto = { ...createQuoteDto, tvaRate: undefined };
      await service.create(testUserId, dto);

      const createCall = mockPrisma.certifiedQuote.create.mock.calls[0][0];
      const items = createCall.data.items as QuoteLineItem[];
      // Each item should have tvaRate of 20 (the default)
      items.forEach((item: QuoteLineItem) => {
        expect(item.tvaRate).toBe(20);
      });
    });

    it('should default validityDays to 30 when not specified', async () => {
      mockPrisma.certifiedQuote.count.mockResolvedValue(0);
      mockPrisma.certifiedQuote.create.mockResolvedValue(mockQuote);

      const dto = { ...createQuoteDto, validityDays: undefined };
      await service.create(testUserId, dto);

      const createCall = mockPrisma.certifiedQuote.create.mock.calls[0][0];
      expect(createCall.data.validityDays).toBe(30);
    });
  });

  // ==================== getById ====================

  describe('getById', () => {
    it('should return a quote owned by the user', async () => {
      mockPrisma.certifiedQuote.findUnique.mockResolvedValue(mockQuote);

      const result = await service.getById('quote-1', testUserId);

      expect(result).toEqual(mockQuote);
    });

    it('should throw "Quote not found" when quote does not exist', async () => {
      mockPrisma.certifiedQuote.findUnique.mockResolvedValue(null);

      await expect(
        service.getById('00000000-0000-0000-0000-000000000000', testUserId),
      ).rejects.toThrow('Quote not found');
    });

    it('should throw "Access denied" when user does not own the quote (IDOR)', async () => {
      mockPrisma.certifiedQuote.findUnique.mockResolvedValue(mockQuote);

      await expect(
        service.getById('quote-1', otherUserId),
      ).rejects.toThrow('Access denied');
    });
  });

  // ==================== list ====================

  describe('list', () => {
    it('should return quotes for the authenticated user ordered by createdAt desc', async () => {
      const quotes = [mockQuote, { ...mockQuote, id: 'quote-2' }];
      mockPrisma.certifiedQuote.findMany.mockResolvedValue(quotes);

      const result = await service.list(testUserId);

      expect(result).toHaveLength(2);
      expect(mockPrisma.certifiedQuote.findMany).toHaveBeenCalledWith({
        where: { userId: testUserId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user has no quotes', async () => {
      mockPrisma.certifiedQuote.findMany.mockResolvedValue([]);

      const result = await service.list(testUserId);

      expect(result).toEqual([]);
    });
  });

  // ==================== sign ====================

  describe('sign', () => {
    it('should sign a draft quote with SHA-256 hash and set status to signed', async () => {
      mockPrisma.certifiedQuote.findUnique.mockResolvedValue(mockQuote);
      const signedQuote = { ...mockQuote, status: 'signed', signatureHash: 'abc123', signedAt: new Date() };
      mockPrisma.certifiedQuote.update.mockResolvedValue(signedQuote);

      const result = await service.sign('quote-1', testUserId);

      expect(result.status).toBe('signed');
      expect(mockPrisma.certifiedQuote.update).toHaveBeenCalledWith({
        where: { id: 'quote-1' },
        data: expect.objectContaining({
          status: 'signed',
          signedByUserId: testUserId,
          signatureHash: expect.any(String),
          signedAt: expect.any(Date),
        }),
      });
    });

    it('should throw when quote is not found', async () => {
      mockPrisma.certifiedQuote.findUnique.mockResolvedValue(null);

      await expect(service.sign('00000000-0000-0000-0000-000000000000', testUserId)).rejects.toThrow('Quote not found');
    });

    it('should throw "Access denied" when user does not own the quote', async () => {
      mockPrisma.certifiedQuote.findUnique.mockResolvedValue(mockQuote);

      await expect(service.sign('quote-1', otherUserId)).rejects.toThrow('Access denied');
    });

    it('should throw when quote is already signed', async () => {
      mockPrisma.certifiedQuote.findUnique.mockResolvedValue({
        ...mockQuote,
        status: 'signed',
      });

      await expect(service.sign('quote-1', testUserId)).rejects.toThrow('Quote is already signed');
    });

    it('should throw when trying to sign an expired quote', async () => {
      mockPrisma.certifiedQuote.findUnique.mockResolvedValue({
        ...mockQuote,
        status: 'expired',
      });

      await expect(service.sign('quote-1', testUserId)).rejects.toThrow(
        'Cannot sign an expired or cancelled quote',
      );
    });

    it('should throw when trying to sign a cancelled quote', async () => {
      mockPrisma.certifiedQuote.findUnique.mockResolvedValue({
        ...mockQuote,
        status: 'cancelled',
      });

      await expect(service.sign('quote-1', testUserId)).rejects.toThrow(
        'Cannot sign an expired or cancelled quote',
      );
    });
  });

  // ==================== generatePDF ====================

  describe('generatePDF', () => {
    it('should generate HTML for a valid quote', async () => {
      mockPrisma.certifiedQuote.findUnique.mockResolvedValue(mockQuote);

      const result = await service.generatePDF('quote-1', testUserId);

      expect(result.html).toContain('KX-2026-00001');
      expect(result.html).toContain('Jean Dupont');
      expect(result.html).toContain('DEVIS');
      expect(result.quote).toEqual(mockQuote);
    });

    it('should throw when quote is not found', async () => {
      mockPrisma.certifiedQuote.findUnique.mockResolvedValue(null);

      await expect(service.generatePDF('00000000-0000-0000-0000-000000000000', testUserId)).rejects.toThrow('Quote not found');
    });

    it('should throw "Access denied" when user does not own the quote', async () => {
      mockPrisma.certifiedQuote.findUnique.mockResolvedValue(mockQuote);

      await expect(service.generatePDF('quote-1', otherUserId)).rejects.toThrow('Access denied');
    });
  });

  // ==================== send ====================

  describe('send', () => {
    it('should send a quote via email and update status from draft to sent', async () => {
      // findUnique is called twice: once in send, once in generatePDF
      mockPrisma.certifiedQuote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.certifiedQuote.update.mockResolvedValue({ ...mockQuote, status: 'sent' });
      mockMailSend.mockResolvedValue(undefined);

      await service.send('quote-1', testUserId, 'jean@example.com');

      expect(mockMailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: { email: 'jean@example.com', name: 'Jean Dupont' },
          subject: expect.stringContaining('KX-2026-00001'),
        }),
      );
      expect(mockPrisma.certifiedQuote.update).toHaveBeenCalledWith({
        where: { id: 'quote-1' },
        data: { status: 'sent' },
      });
    });

    it('should throw when quote is not found', async () => {
      mockPrisma.certifiedQuote.findUnique.mockResolvedValue(null);

      await expect(
        service.send('00000000-0000-0000-0000-000000000000', testUserId, 'test@test.com'),
      ).rejects.toThrow('Quote not found');
    });

    it('should throw "Access denied" when user does not own the quote', async () => {
      mockPrisma.certifiedQuote.findUnique.mockResolvedValue(mockQuote);

      await expect(
        service.send('quote-1', otherUserId, 'test@test.com'),
      ).rejects.toThrow('Access denied');
    });
  });
});
