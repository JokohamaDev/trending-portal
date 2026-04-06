import { z } from 'zod';

// Base trending item schema - used across all categories
export const TrendingItemSchema = z.object({
  rank: z.number().int().min(1).max(200),
  title: z.string().min(1).max(500),
  artist: z.string().min(1).max(500),
  thumbnailUrl: z.string().url().nullable(),
  externalUrl: z.string().url(),
  source: z.string(),
  fetchedAt: z.string().datetime(),
});

// Category-specific schemas
export const SpotifyItemSchema = TrendingItemSchema.extend({
  source: z.literal('spotify'),
});

export const YouTubeItemSchema = TrendingItemSchema.extend({
  source: z.literal('youtube'),
  videoId: z.string().optional(),
  viewCount: z.string().optional(),
});

export const NetflixItemSchema = TrendingItemSchema.extend({
  source: z.literal('netflix'),
  type: z.enum(['movie', 'show']),
});

export const GoogleItemSchema = TrendingItemSchema.extend({
  source: z.literal('google'),
  searchVolume: z.string().optional(),
});

// Union of all item types
export const TrendingItemUnionSchema = z.union([
  SpotifyItemSchema,
  YouTubeItemSchema,
  NetflixItemSchema,
  GoogleItemSchema,
]);

// Category data schema
export const CategoryDataSchema = z.object({
  items: z.array(TrendingItemSchema).min(1).max(200),
  lastUpdated: z.string().datetime(),
  source: z.string(),
  healthy: z.boolean(),
});

// Full trends data schema
export const TrendsDataSchema = z.object({
  spotify: CategoryDataSchema.optional(),
  youtube: CategoryDataSchema.optional(),
  netflix: CategoryDataSchema.optional(),
  google: CategoryDataSchema.optional(),
  lastUpdated: z.string().datetime(),
});

// Type exports
export type TrendingItem = z.infer<typeof TrendingItemSchema>;
export type SpotifyItem = z.infer<typeof SpotifyItemSchema>;
export type YouTubeItem = z.infer<typeof YouTubeItemSchema>;
export type NetflixItem = z.infer<typeof NetflixItemSchema>;
export type GoogleItem = z.infer<typeof GoogleItemSchema>;
export type CategoryData = z.infer<typeof CategoryDataSchema>;
export type TrendsData = z.infer<typeof TrendsDataSchema>;
