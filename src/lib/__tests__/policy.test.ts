import { vi } from 'vitest';
import { getPolicyForChat, passesTokenPolicy } from '../policy';
import * as counterparty from '../counterparty';

// Mock the database module
vi.mock('@/src/db/prisma', () => ({
  db: {
    policy: {
      findUnique: vi.fn()
    }
  }
}));

// Mock counterparty module
vi.mock('../counterparty');

// Import after mocking
import { db } from '@/src/db/prisma';

describe('policy utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPolicyForChat', () => {
    it('should return policy for existing chat', async () => {
      const mockPolicy = {
        id: 'policy123',
        chatId: 'chat456',
        type: 'token',
        asset: 'XCP',
        minAmount: '1.0',
        onFail: 'kick',
        includeUnconfirmed: false,
        recheckEvery: '30',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(db.policy.findUnique).mockResolvedValue(mockPolicy);

      const result = await getPolicyForChat('chat456');

      expect(result).toEqual(mockPolicy);
      expect(db.policy.findUnique).toHaveBeenCalledWith({
        where: { chatId: 'chat456' }
      });
    });

    it('should return null for non-existent chat', async () => {
      vi.mocked(db.policy.findUnique).mockResolvedValue(null);

      const result = await getPolicyForChat('nonexistent');

      expect(result).toBeNull();
      expect(db.policy.findUnique).toHaveBeenCalledWith({
        where: { chatId: 'nonexistent' }
      });
    });

    it('should return null when database is not connected', async () => {
      vi.mocked(db.policy.findUnique).mockRejectedValue(new Error('Database not connected'));

      // Spy on console.error to verify it's called
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await getPolicyForChat('chat456');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Database not connected:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(db.policy.findUnique).mockRejectedValue(new Error('Connection timeout'));

      const result = await getPolicyForChat('chat456');

      expect(result).toBeNull();
    });
  });

  describe('passesTokenPolicy', () => {
    it('should return true when balance meets minimum requirement', async () => {
      const mockRows = [
        {
          address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          asset: 'XCP',
          quantity: '200000000', // 2.0 XCP in atomic units
          asset_info: { divisible: true }
        }
      ];

      vi.mocked(counterparty.fetchAddressAssetRows).mockResolvedValue(mockRows);
      vi.mocked(counterparty.reduceBalance).mockReturnValue({
        atomic: BigInt('200000000'),
        decimals: 8
      });
      vi.mocked(counterparty.parseToAtomic).mockReturnValue(BigInt('100000000')); // 1.0 XCP

      const result = await passesTokenPolicy(
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        {
          asset: 'XCP',
          min_amount: '1.0'
        }
      );

      expect(result).toBe(true);
      expect(counterparty.fetchAddressAssetRows).toHaveBeenCalledWith(
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        'XCP',
        {
          verbose: true,
          show_unconfirmed: false
        }
      );
      expect(counterparty.reduceBalance).toHaveBeenCalledWith(mockRows);
      expect(counterparty.parseToAtomic).toHaveBeenCalledWith('1.0', 8);
    });

    it('should return false when balance is below minimum requirement', async () => {
      const mockRows = [
        {
          address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          asset: 'XCP',
          quantity: '50000000', // 0.5 XCP in atomic units
          asset_info: { divisible: true }
        }
      ];

      vi.mocked(counterparty.fetchAddressAssetRows).mockResolvedValue(mockRows);
      vi.mocked(counterparty.reduceBalance).mockReturnValue({
        atomic: BigInt('50000000'),
        decimals: 8
      });
      vi.mocked(counterparty.parseToAtomic).mockReturnValue(BigInt('100000000')); // 1.0 XCP

      const result = await passesTokenPolicy(
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        {
          asset: 'XCP',
          min_amount: '1.0'
        }
      );

      expect(result).toBe(false);
    });

    it('should return true when balance exactly meets requirement', async () => {
      const mockRows = [
        {
          address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          asset: 'PEPECASH',
          quantity: '1000000',
          asset_info: { divisible: true }
        }
      ];

      vi.mocked(counterparty.fetchAddressAssetRows).mockResolvedValue(mockRows);
      vi.mocked(counterparty.reduceBalance).mockReturnValue({
        atomic: BigInt('1000000'),
        decimals: 8
      });
      vi.mocked(counterparty.parseToAtomic).mockReturnValue(BigInt('1000000'));

      const result = await passesTokenPolicy(
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        {
          asset: 'PEPECASH',
          min_amount: '0.01'
        }
      );

      expect(result).toBe(true);
    });

    it('should handle include_unconfirmed option', async () => {
      const mockRows = [
        {
          address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          asset: 'XCP',
          quantity: '200000000',
          asset_info: { divisible: true }
        }
      ];

      vi.mocked(counterparty.fetchAddressAssetRows).mockResolvedValue(mockRows);
      vi.mocked(counterparty.reduceBalance).mockReturnValue({
        atomic: BigInt('200000000'),
        decimals: 8
      });
      vi.mocked(counterparty.parseToAtomic).mockReturnValue(BigInt('100000000'));

      await passesTokenPolicy(
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        {
          asset: 'XCP',
          min_amount: '1.0',
          include_unconfirmed: true
        }
      );

      expect(counterparty.fetchAddressAssetRows).toHaveBeenCalledWith(
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        'XCP',
        {
          verbose: true,
          show_unconfirmed: true
        }
      );
    });

    it('should handle indivisible assets', async () => {
      const mockRows = [
        {
          address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          asset: 'RARE',
          quantity: '5',
          asset_info: { divisible: false }
        }
      ];

      vi.mocked(counterparty.fetchAddressAssetRows).mockResolvedValue(mockRows);
      vi.mocked(counterparty.reduceBalance).mockReturnValue({
        atomic: BigInt('5'),
        decimals: 0
      });
      vi.mocked(counterparty.parseToAtomic).mockReturnValue(BigInt('1'));

      const result = await passesTokenPolicy(
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        {
          asset: 'RARE',
          min_amount: '1'
        }
      );

      expect(result).toBe(true);
      expect(counterparty.parseToAtomic).toHaveBeenCalledWith('1', 0);
    });

    it('should return false when address has no balance', async () => {
      vi.mocked(counterparty.fetchAddressAssetRows).mockResolvedValue([]);
      vi.mocked(counterparty.reduceBalance).mockReturnValue({
        atomic: BigInt('0'),
        decimals: 8
      });
      vi.mocked(counterparty.parseToAtomic).mockReturnValue(BigInt('100000000'));

      const result = await passesTokenPolicy(
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        {
          asset: 'XCP',
          min_amount: '1.0'
        }
      );

      expect(result).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(counterparty.fetchAddressAssetRows).mockRejectedValue(
        new Error('XCP API 500')
      );

      await expect(
        passesTokenPolicy(
          '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          {
            asset: 'XCP',
            min_amount: '1.0'
          }
        )
      ).rejects.toThrow('XCP API 500');
    });

    it('should handle large numbers correctly', async () => {
      const mockRows = [
        {
          address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          asset: 'PEPECASH',
          quantity: '42000000000000',
          asset_info: { divisible: true }
        }
      ];

      vi.mocked(counterparty.fetchAddressAssetRows).mockResolvedValue(mockRows);
      vi.mocked(counterparty.reduceBalance).mockReturnValue({
        atomic: BigInt('42000000000000'),
        decimals: 8
      });
      vi.mocked(counterparty.parseToAtomic).mockReturnValue(BigInt('42000000000000'));

      const result = await passesTokenPolicy(
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        {
          asset: 'PEPECASH',
          min_amount: '420000'
        }
      );

      expect(result).toBe(true);
    });
  });
});