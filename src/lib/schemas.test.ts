import { describe, it, expect } from 'vitest';
import {
  TrendingItemSchema,
  CategoryDataSchema,
  TrendsDataSchema,
  SpotifyItemSchema,
  YouTubeItemSchema,
  NetflixItemSchema,
  GoogleItemSchema,
  NewsItemSchema,
  SteamItemSchema,
} from './schemas';

describe('Schema validation', () => {
  describe('TrendingItemSchema', () => {
    it('should validate a valid trending item', () => {
      const validItem = {
        rank: 1,
        title: 'Test Title',
        artist: 'Test Artist',
        thumbnailUrl: 'https://example.com/image.jpg',
        externalUrl: 'https://example.com',
        source: 'test',
        fetchedAt: '2026-04-10T10:00:00.000Z',
      };

      const result = TrendingItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('should reject invalid rank', () => {
      const invalidItem = {
        rank: 0,
        title: 'Test',
        artist: 'Test',
        thumbnailUrl: null,
        externalUrl: 'https://example.com',
        source: 'test',
        fetchedAt: '2026-04-10T10:00:00.000Z',
      };

      const result = TrendingItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL', () => {
      const invalidItem = {
        rank: 1,
        title: 'Test',
        artist: 'Test',
        thumbnailUrl: null,
        externalUrl: 'not-a-url',
        source: 'test',
        fetchedAt: '2026-04-10T10:00:00.000Z',
      };

      const result = TrendingItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should allow null thumbnailUrl', () => {
      const validItem = {
        rank: 1,
        title: 'Test',
        artist: 'Test',
        thumbnailUrl: null,
        externalUrl: 'https://example.com',
        source: 'test',
        fetchedAt: '2026-04-10T10:00:00.000Z',
      };

      const result = TrendingItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });
  });

  describe('CategoryDataSchema', () => {
    it('should validate valid category data', () => {
      const validCategory = {
        items: [
          {
            rank: 1,
            title: 'Test',
            artist: 'Test',
            thumbnailUrl: null,
            externalUrl: 'https://example.com',
            source: 'test',
            fetchedAt: '2026-04-10T10:00:00.000Z',
          },
        ],
        lastUpdated: '2026-04-10T10:00:00.000Z',
        source: 'test-source',
        healthy: true,
      };

      const result = CategoryDataSchema.safeParse(validCategory);
      expect(result.success).toBe(true);
    });

    it('should reject empty items array', () => {
      const invalidCategory = {
        items: [],
        lastUpdated: '2026-04-10T10:00:00.000Z',
        source: 'test-source',
        healthy: true,
      };

      const result = CategoryDataSchema.safeParse(invalidCategory);
      expect(result.success).toBe(false);
    });
  });

  describe('Category-specific schemas', () => {
    it('should validate SpotifyItemSchema', () => {
      const spotifyItem = {
        rank: 1,
        title: 'Test Song',
        artist: 'Test Artist',
        thumbnailUrl: 'https://example.com/image.jpg',
        externalUrl: 'https://open.spotify.com/track/test',
        source: 'spotify' as const,
        fetchedAt: '2026-04-10T10:00:00.000Z',
      };

      const result = SpotifyItemSchema.safeParse(spotifyItem);
      expect(result.success).toBe(true);
    });

    it('should validate NetflixItemSchema with type', () => {
      const netflixItem = {
        rank: 1,
        title: 'Test Movie',
        artist: 'Movie',
        thumbnailUrl: 'https://example.com/image.jpg',
        externalUrl: 'https://example.com',
        source: 'netflix' as const,
        fetchedAt: '2026-04-10T10:00:00.000Z',
        type: 'movie' as const,
      };

      const result = NetflixItemSchema.safeParse(netflixItem);
      expect(result.success).toBe(true);
    });

    it('should reject NetflixItemSchema without type', () => {
      const invalidItem = {
        rank: 1,
        title: 'Test',
        artist: 'Test',
        thumbnailUrl: null,
        externalUrl: 'https://example.com',
        source: 'netflix' as const,
        fetchedAt: '2026-04-10T10:00:00.000Z',
      };

      const result = NetflixItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });
  });

  describe('TrendsDataSchema', () => {
    it('should validate complete trends data', () => {
      const validTrends = {
        spotify: {
          items: [
            {
              rank: 1,
              title: 'Test',
              artist: 'Test',
              thumbnailUrl: null,
              externalUrl: 'https://example.com',
              source: 'spotify' as const,
              fetchedAt: '2026-04-10T10:00:00.000Z',
            },
          ],
          lastUpdated: '2026-04-10T10:00:00.000Z',
          source: 'spotify-api',
          healthy: true,
        },
        youtube: undefined,
        netflix: undefined,
        google: undefined,
        news: undefined,
        steam: undefined,
        lastUpdated: '2026-04-10T10:00:00.000Z',
      };

      const result = TrendsDataSchema.safeParse(validTrends);
      expect(result.success).toBe(true);
    });

    it('should allow all categories to be optional', () => {
      const minimalTrends = {
        spotify: undefined,
        youtube: undefined,
        netflix: undefined,
        google: undefined,
        news: undefined,
        steam: undefined,
        lastUpdated: '2026-04-10T10:00:00.000Z',
      };

      const result = TrendsDataSchema.safeParse(minimalTrends);
      expect(result.success).toBe(true);
    });
  });
});
