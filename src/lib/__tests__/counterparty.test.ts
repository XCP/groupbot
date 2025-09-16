import { vi } from 'vitest';

// Set environment variable BEFORE importing the module
process.env.XCP_API_BASE = 'https://api.counterparty.io:4000';

import { fetchAddressAssetRows, reduceBalance, parseToAtomic } from '../counterparty';

// Mock fetch globally
global.fetch = vi.fn();

describe('counterparty utilities', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAddressAssetRows', () => {
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

    it('should fetch address asset rows successfully', async () => {
      const mockResponse = [
        {
          address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
          asset: 'XCP',
          quantity: '100000000',
          asset_info: { divisible: true },
          quantity_normalized: '1.0'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: mockResponse }),
      } as Response);

      const result = await fetchAddressAssetRows(
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        'XCP'
      );

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        new URL('https://api.counterparty.io:4000/addresses/1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2/balances/XCP')
      );
    });

    it('should include verbose parameter when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: [] }),
      } as Response);

      await fetchAddressAssetRows(
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        'XCP',
        { verbose: true }
      );

      const expectedUrl = new URL('https://api.counterparty.io:4000/addresses/1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2/balances/XCP');
      expectedUrl.searchParams.set('verbose', '1');

      expect(mockFetch).toHaveBeenCalledWith(expectedUrl);
    });

    it('should include show_unconfirmed parameter when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: [] }),
      } as Response);

      await fetchAddressAssetRows(
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        'XCP',
        { show_unconfirmed: true }
      );

      const expectedUrl = new URL('https://api.counterparty.io:4000/addresses/1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2/balances/XCP');
      expectedUrl.searchParams.set('show_unconfirmed', '1');

      expect(mockFetch).toHaveBeenCalledWith(expectedUrl);
    });

    it('should include both parameters when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: [] }),
      } as Response);

      await fetchAddressAssetRows(
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        'XCP',
        { verbose: true, show_unconfirmed: true }
      );

      const expectedUrl = new URL('https://api.counterparty.io:4000/addresses/1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2/balances/XCP');
      expectedUrl.searchParams.set('verbose', '1');
      expectedUrl.searchParams.set('show_unconfirmed', '1');

      expect(mockFetch).toHaveBeenCalledWith(expectedUrl);
    });

    it('should return empty array when result is undefined', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await fetchAddressAssetRows(
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        'XCP'
      );

      expect(result).toEqual([]);
    });

    it('should throw error when API returns non-ok status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(
        fetchAddressAssetRows('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', 'XCP')
      ).rejects.toThrow('XCP API 404');
    });
  });

  describe('reduceBalance', () => {
    it('should sum quantities for divisible assets', () => {
      const rows = [
        {
          address: '1test',
          asset: 'XCP',
          quantity: '100000000',
          asset_info: { divisible: true },
          quantity_normalized: '1.0'
        },
        {
          address: '1test',
          asset: 'XCP',
          quantity: '200000000',
          asset_info: { divisible: true },
          quantity_normalized: '2.0'
        }
      ];

      const result = reduceBalance(rows);
      expect(result).toEqual({ atomic: 300000000n, decimals: 8 });
    });

    it('should sum quantities for non-divisible assets', () => {
      const rows = [
        {
          address: '1test',
          asset: 'PEPE',
          quantity: '100',
          asset_info: { divisible: false }
        },
        {
          address: '1test',
          asset: 'PEPE',
          quantity: '200',
          asset_info: { divisible: false }
        }
      ];

      const result = reduceBalance(rows);
      expect(result).toEqual({ atomic: 300n, decimals: 0 });
    });

    it('should return 0 for empty array', () => {
      const result = reduceBalance([]);
      expect(result).toEqual({ atomic: 0n, decimals: 8 });
    });

    it('should handle mixed asset types', () => {
      const rows = [
        {
          address: '1test',
          asset: 'XCP',
          quantity: '100000000',
          asset_info: { divisible: true },
          quantity_normalized: '1.0'
        },
        {
          address: '1test',
          asset: 'PEPE',
          quantity: '50',
          asset_info: { divisible: false }
        }
      ];

      const result = reduceBalance(rows);
      expect(result).toEqual({ atomic: 100000050n, decimals: 0 });
    });
  });

  describe('parseToAtomic', () => {
    it('should parse integer values correctly', () => {
      expect(parseToAtomic('1', 0)).toBe(1n);
      expect(parseToAtomic('100', 0)).toBe(100n);
      expect(parseToAtomic('1000000', 0)).toBe(1000000n);
    });

    it('should parse divisible values correctly', () => {
      expect(parseToAtomic('1', 8)).toBe(100000000n);
      expect(parseToAtomic('0.1', 8)).toBe(10000000n);
      expect(parseToAtomic('0.00000001', 8)).toBe(1n);
      expect(parseToAtomic('100.5', 8)).toBe(10050000000n);
    });

    it('should handle edge cases', () => {
      expect(parseToAtomic('0', 0)).toBe(0n);
      expect(parseToAtomic('0', 8)).toBe(0n);
      expect(parseToAtomic('0.0', 8)).toBe(0n);
    });

    it('should handle large numbers', () => {
      expect(parseToAtomic('1000000000', 0)).toBe(1000000000n);
      expect(parseToAtomic('1000000', 8)).toBe(100000000000000n);
    });

    it('should handle very small divisible amounts', () => {
      expect(parseToAtomic('0.00000001', 8)).toBe(1n);
      expect(parseToAtomic('0.00000010', 8)).toBe(10n);
      expect(parseToAtomic('0.12345678', 8)).toBe(12345678n);
    });

    it('should round down for extra decimals', () => {
      expect(parseToAtomic('0.123456789', 8)).toBe(12345678n);
      expect(parseToAtomic('1.999999999', 8)).toBe(199999999n);
    });
  });
});