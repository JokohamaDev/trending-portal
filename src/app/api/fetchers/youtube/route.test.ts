import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './route';

// Mock dependencies
vi.mock('@/lib/kv', () => ({
  storeCategoryDataSmart: vi.fn(),
  getCategoryDataSmart: vi.fn(),
  KV_KEYS: {
    YOUTUBE: 'trending_youtube',
  },
}));

vi.mock('@/lib/validation', () => ({
  sanitizeTrendingItems: vi.fn((items) => items),
}));

describe('YouTube fetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when YOUTUBE_API_KEY is not set', async () => {
    process.env.YOUTUBE_API_KEY = '';
    
    const response = await GET();
    const json = await response.json();
    
    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    // Error message may vary depending on where validation occurs
    expect(json.error).toBeDefined();
  });

  it('should return cached data when available and API fails', async () => {
    process.env.YOUTUBE_API_KEY = 'test-key';
    
    const { getCategoryDataSmart } = await import('@/lib/kv');
    vi.mocked(getCategoryDataSmart).mockResolvedValue({
      items: [
        {
          rank: 1,
          title: 'Cached Video',
          artist: 'Test Channel',
          thumbnailUrl: 'https://example.com/image.jpg',
          externalUrl: 'https://youtube.com/watch?v=test',
          source: 'youtube',
          fetchedAt: new Date().toISOString(),
        },
      ],
      lastUpdated: new Date().toISOString(),
      source: 'youtube-api',
      healthy: true,
    });

    global.fetch = vi.fn().mockRejectedValue(new Error('API failed'));

    const response = await GET();
    const json = await response.json();
    
    expect(json.success).toBe(true);
    expect(json.cached).toBe(true);
    expect(json.data).toBeDefined();
  });

  it('should return error when both API and cache fail', async () => {
    process.env.YOUTUBE_API_KEY = 'test-key';
    
    const { getCategoryDataSmart } = await import('@/lib/kv');
    vi.mocked(getCategoryDataSmart).mockResolvedValue(null);

    global.fetch = vi.fn().mockRejectedValue(new Error('API failed'));

    const response = await GET();
    const json = await response.json();
    
    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
  });
});
