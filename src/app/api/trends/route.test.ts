import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/kv', () => ({
  getCategoryDataSmart: vi.fn(),
  storeCategoryDataSmart: vi.fn(),
  KV_KEYS: {
    SPOTIFY: 'trending_spotify',
    YOUTUBE: 'trending_youtube',
    NETFLIX: 'trending_netflix',
    GOOGLE: 'trending_google',
    NEWS: 'trending_news',
    STEAM: 'trending_steam',
    ALL: 'trending_all',
  },
}));

vi.mock('@/lib/validation', () => ({
  validateCategoryData: vi.fn((data) => ({ success: true, data })),
}));

describe('/api/trends endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate query parameters', async () => {
    const { getCategoryDataSmart } = await import('@/lib/kv');
    vi.mocked(getCategoryDataSmart).mockResolvedValue({
      items: [],
      lastUpdated: new Date().toISOString(),
      source: 'test',
      healthy: true,
    });

    const request = new NextRequest('http://localhost/api/trends?refresh=invalid');
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Invalid query parameters');
  });

  it('should accept valid refresh parameter', async () => {
    const { getCategoryDataSmart } = await import('@/lib/kv');
    vi.mocked(getCategoryDataSmart).mockResolvedValue({
      items: [],
      lastUpdated: new Date().toISOString(),
      source: 'test',
      healthy: true,
    });

    const request = new NextRequest('http://localhost/api/trends?refresh=1');
    const response = await GET(request);
    
    expect(response.status).not.toBe(400);
  });

  it('should return aggregated data from all categories', async () => {
    const { getCategoryDataSmart } = await import('@/lib/kv');
    vi.mocked(getCategoryDataSmart).mockResolvedValue({
      items: [
        {
          rank: 1,
          title: 'Test',
          artist: 'Test Artist',
          thumbnailUrl: 'https://example.com/image.jpg',
          externalUrl: 'https://example.com',
          source: 'test',
          fetchedAt: new Date().toISOString(),
        },
      ],
      lastUpdated: new Date().toISOString(),
      source: 'test',
      healthy: true,
    });

    const request = new NextRequest('http://localhost/api/trends');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(json.sourceHealth).toBeDefined();
  });

  it('should include source health information', async () => {
    const { getCategoryDataSmart } = await import('@/lib/kv');
    vi.mocked(getCategoryDataSmart).mockResolvedValue({
      items: [],
      lastUpdated: new Date().toISOString(),
      source: 'test',
      healthy: true,
    });

    const request = new NextRequest('http://localhost/api/trends');
    const response = await GET(request);
    
    const json = await response.json();
    expect(json.sourceHealth).toBeDefined();
    expect(json.meta).toBeDefined();
    expect(json.meta.totalCategories).toBeGreaterThan(0);
  });

  it('should handle errors gracefully', async () => {
    const { getCategoryDataSmart } = await import('@/lib/kv');
    vi.mocked(getCategoryDataSmart).mockRejectedValue(new Error('Test error'));

    const request = new NextRequest('http://localhost/api/trends');
    const response = await GET(request);
    
    // Route handles errors gracefully and returns success:true with partial/empty data
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
  });

  it('should set appropriate cache headers', async () => {
    const { getCategoryDataSmart } = await import('@/lib/kv');
    vi.mocked(getCategoryDataSmart).mockResolvedValue({
      items: [],
      lastUpdated: new Date().toISOString(),
      source: 'test',
      healthy: true,
    });

    const request = new NextRequest('http://localhost/api/trends');
    const response = await GET(request);
    
    expect(response.headers.get('Cache-Control')).toContain('public');
  });

  it('should bypass cache when refresh=1', async () => {
    const { getCategoryDataSmart } = await import('@/lib/kv');
    vi.mocked(getCategoryDataSmart).mockResolvedValue({
      items: [],
      lastUpdated: new Date().toISOString(),
      source: 'test',
      healthy: true,
    });

    const request = new NextRequest('http://localhost/api/trends?refresh=1');
    const response = await GET(request);
    
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
});
