import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, fetchFromTuoiTreRSS } from './route';

// Mock dependencies
vi.mock('@/lib/kv', () => ({
  storeCategoryDataSmart: vi.fn(),
  getCategoryDataSmart: vi.fn(),
  KV_KEYS: {
    NEWS: 'trending_news',
  },
}));

vi.mock('@/lib/validation', () => ({
  sanitizeTrendingItems: vi.fn((items) => items),
}));

describe('News fetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch from Tuoi Tre RSS', async () => {
    const mockRSS = `
      <?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>Test News Article</title>
            <description>Test description</description>
            <pubDate>Thu, 10 Apr 2026 09:30:00 GMT</pubDate>
            <link>https://tuoitre.vn/test-article</link>
            <enclosure url="https://cdn2.tuoitre.vn/image.jpg" type="image/jpeg"/>
          </item>
        </channel>
      </rss>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockRSS),
    });

    const items = await fetchFromTuoiTreRSS();
    
    expect(items).toBeDefined();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].title).toBe('Test News Article');
  });

  it('should handle RSS fetch errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { getCategoryDataSmart } = await import('@/lib/kv');
    vi.mocked(getCategoryDataSmart).mockResolvedValue({
      items: [
        {
          rank: 1,
          title: 'Cached News',
          artist: '09:30',
          thumbnailUrl: 'https://example.com/image.jpg',
          externalUrl: 'https://tuoitre.vn/cached-news',
          source: 'news',
          fetchedAt: new Date().toISOString(),
        },
      ],
      lastUpdated: new Date().toISOString(),
      source: 'tuoitre-rss',
      healthy: true,
    });

    const response = await GET();
    const json = await response.json();
    
    expect(json.success).toBe(true);
    expect(json.cached).toBe(true);
  });

  it('should return error when both RSS and cache fail', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { getCategoryDataSmart } = await import('@/lib/kv');
    vi.mocked(getCategoryDataSmart).mockResolvedValue(null);

    const response = await GET();
    const json = await response.json();
    
    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
  });

  it('should extract thumbnail from RSS enclosure', async () => {
    const mockRSS = `
      <?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>News with Image</title>
            <description>Test</description>
            <pubDate>Thu, 10 Apr 2026 09:30:00 GMT</pubDate>
            <link>https://tuoitre.vn/news</link>
            <enclosure url="https://cdn2.tuoitre.vn/thumb.jpg" type="image/jpeg"/>
          </item>
        </channel>
      </rss>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockRSS),
    });

    const items = await fetchFromTuoiTreRSS();
    
    expect(items[0].thumbnailUrl).toBe('https://cdn2.tuoitre.vn/thumb.jpg');
  });
});
