import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, fetchFromGoogleTrendsRSS } from './route';

// Mock dependencies
vi.mock('@/lib/kv', () => ({
  storeCategoryDataSmart: vi.fn(),
  getCategoryDataSmart: vi.fn(),
  KV_KEYS: {
    GOOGLE: 'trending_google',
  },
}));

vi.mock('@/lib/validation', () => ({
  sanitizeTrendingItems: vi.fn((items) => items),
}));

describe('Google fetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch from Google Trends RSS', async () => {
    const mockRSS = `
      <?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>Test Trend</title>
            <ht:approx_traffic>50K+</ht:approx_traffic>
            <ht:picture>https://example.com/image.jpg</ht:picture>
            <ht:news_item_url>https://example.com/news</ht:news_item_url>
          </item>
        </channel>
      </rss>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockRSS),
    });

    const items = await fetchFromGoogleTrendsRSS();
    
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Test Trend');
    expect(items[0].artist).toBe('50K+');
  });

  it('should return cached data when RSS fetch fails', async () => {
    const { getCategoryDataSmart } = await import('@/lib/kv');
    vi.mocked(getCategoryDataSmart).mockResolvedValue({
      items: [
        {
          rank: 1,
          title: 'Cached Trend',
          artist: '30K+ searches',
          thumbnailUrl: null,
          externalUrl: 'https://google.com/search?q=test',
          source: 'google',
          fetchedAt: new Date().toISOString(),
        },
      ],
      lastUpdated: new Date().toISOString(),
      source: 'google-trends-rss',
      healthy: true,
    });

    global.fetch = vi.fn().mockRejectedValue(new Error('RSS fetch failed'));

    const response = await GET();
    const json = await response.json();
    
    expect(json.success).toBe(true);
    expect(json.cached).toBe(true);
  });

  it('should handle empty RSS response', async () => {
    const mockRSS = `
      <?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
        </channel>
      </rss>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockRSS),
    });

    await expect(fetchFromGoogleTrendsRSS()).rejects.toThrow('No items found');
  });
});
