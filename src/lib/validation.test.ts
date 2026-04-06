import { describe, it, expect } from 'vitest';
import {
  validateData,
  validateTrendingItem,
  validateTrendingItems,
  validateCategoryData,
  sanitizeTrendingItem,
  sanitizeTrendingItems,
} from './validation';
import { TrendingItemSchema, CategoryDataSchema } from './schemas';

describe('validation', () => {
  const validItem = {
    rank: 1,
    title: 'Test Song',
    artist: 'Test Artist',
    thumbnailUrl: 'https://example.com/image.jpg',
    externalUrl: 'https://example.com/song',
    source: 'spotify',
    fetchedAt: '2026-01-01T00:00:00.000Z',
  };

  describe('validateData', () => {
    it('should validate correct data', () => {
      const result = validateData(validItem, TrendingItemSchema);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validItem);
    });

    it('should return errors for invalid data', () => {
      const invalidItem = { ...validItem, rank: -1 };
      const result = validateData(invalidItem, TrendingItemSchema);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should handle non-Zod errors', () => {
      const result = validateData(null, TrendingItemSchema);
      expect(result.success).toBe(false);
    });
  });

  describe('validateTrendingItem', () => {
    it('should validate a valid item', () => {
      const result = validateTrendingItem(validItem);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validItem);
    });

    it('should reject item with missing fields', () => {
      const invalidItem = { title: 'Test' };
      const result = validateTrendingItem(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject item with invalid rank', () => {
      const invalidItem = { ...validItem, rank: 0 };
      const result = validateTrendingItem(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject item with rank > 200', () => {
      const invalidItem = { ...validItem, rank: 201 };
      const result = validateTrendingItem(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should accept null thumbnailUrl', () => {
      const itemWithNullThumbnail = { ...validItem, thumbnailUrl: null };
      const result = validateTrendingItem(itemWithNullThumbnail);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', () => {
      const invalidItem = { ...validItem, externalUrl: 'not-a-url' };
      const result = validateTrendingItem(invalidItem);
      expect(result.success).toBe(false);
    });
  });

  describe('validateTrendingItems', () => {
    it('should validate array of items', () => {
      const items = [validItem, { ...validItem, rank: 2, title: 'Another Song' }];
      const result = validateTrendingItems(items);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should reject if any item is invalid', () => {
      const items = [validItem, { ...validItem, rank: -1 }];
      const result = validateTrendingItems(items);
      expect(result.success).toBe(false);
    });

    it('should handle empty array', () => {
      const result = validateTrendingItems([]);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('validateCategoryData', () => {
    const validCategoryData = {
      items: [validItem],
      lastUpdated: '2026-01-01T00:00:00.000Z',
      source: 'spotify',
      healthy: true,
    };

    it('should validate valid category data', () => {
      const result = validateCategoryData(validCategoryData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validCategoryData);
    });

    it('should reject empty items array', () => {
      const invalidData = { ...validCategoryData, items: [] };
      const result = validateCategoryData(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject too many items', () => {
      const manyItems = Array(201).fill(validItem).map((item, i) => ({ ...item, rank: i + 1 }));
      const invalidData = { ...validCategoryData, items: manyItems };
      const result = validateCategoryData(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('sanitizeTrendingItem', () => {
    it('should return valid item', () => {
      const result = sanitizeTrendingItem(validItem);
      expect(result).toEqual(validItem);
    });

    it('should return null for invalid item', () => {
      const result = sanitizeTrendingItem({ invalid: 'data' });
      expect(result).toBeNull();
    });
  });

  describe('sanitizeTrendingItems', () => {
    it('should filter valid items', () => {
      const items = [validItem, { invalid: 'data' }, { ...validItem, rank: 2 }];
      const result = sanitizeTrendingItems(items);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(validItem);
      expect(result[1].rank).toBe(2);
    });

    it('should return empty array for non-array input', () => {
      const result = sanitizeTrendingItems('not an array' as any);
      expect(result).toEqual([]);
    });

    it('should handle empty array', () => {
      const result = sanitizeTrendingItems([]);
      expect(result).toEqual([]);
    });
  });
});
