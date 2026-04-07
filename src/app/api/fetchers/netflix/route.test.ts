import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

// Mock the KV module
vi.mock('@/lib/kv', () => ({
  storeCategoryDataSmart: vi.fn(),
  getCategoryDataSmart: vi.fn(),
  KV_KEYS: {
    NETFLIX: 'trending_netflix',
  },
}));

// Mock the validation module
vi.mock('@/lib/validation', () => ({
  sanitizeTrendingItems: vi.fn((items) => items),
}));

import { storeCategoryDataSmart, getCategoryDataSmart } from '@/lib/kv';

describe('Netflix Fetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env.OMDB_API_KEY = 'test-api-key';
  });

  it('should fetch and transform FlixPatrol data', async () => {
    // Mock FlixPatrol HTML response
    const mockHtml = `
      <html>
        <body>
          <h2>TOP 10 Movies</h2>
          <table class="card-table">
            <tr class="table-group">
              <td class="table-td">1. </td>
              <td><a href="/title/movie1/" class="hover:underline">Test Movie 1</a></td>
            </tr>
            <tr class="table-group">
              <td class="table-td">2. </td>
              <td><a href="/title/movie2/" class="hover:underline">Test Movie 2</a></td>
            </tr>
          </table>
          <h2>TOP 10 TV Shows</h2>
          <table class="card-table">
            <tr class="table-group">
              <td class="table-td">1. </td>
              <td><a href="/title/show1/" class="hover:underline">Test Show 1</a></td>
            </tr>
            <tr class="table-group">
              <td class="table-td">2. </td>
              <td><a href="/title/show2/" class="hover:underline">Test Show 2</a></td>
            </tr>
          </table>
        </body>
      </html>
    `;

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    });

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(4);
    expect(data.source).toBe('netflix-flixpatrol');
    expect(data.data[0]).toMatchObject({
      rank: 1,
      title: 'Test Movie 1',
      artist: 'Movie',
      type: 'movie',
      source: 'netflix',
    });
  });

  it('should handle API errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toContain('Failed to fetch Netflix Top 10');
  });

  it('should use cached data when API fails', async () => {
    const mockCachedData = {
      items: [
        {
          rank: 1,
          title: 'Cached Movie',
          artist: 'Movie',
          type: 'movie',
          thumbnailUrl: null,
          externalUrl: 'https://example.com',
          source: 'netflix',
          fetchedAt: new Date().toISOString(),
        },
      ],
      lastUpdated: new Date().toISOString(),
      source: 'netflix-flixpatrol',
      healthy: true,
    };

    global.fetch = vi.fn().mockRejectedValueOnce(new Error('API error'));
    (getCategoryDataSmart as any).mockResolvedValueOnce(mockCachedData);

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.cached).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].title).toBe('Cached Movie');
  });

  it('should return 500 when everything fails', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('API error'));
    (getCategoryDataSmart as any).mockResolvedValueOnce(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Failed to fetch Netflix Top 10');
  });

  it('should mark cache as stale when older than 7 days', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 8);

    const mockCachedData = {
      items: [
        {
          rank: 1,
          title: 'Old Movie',
          artist: 'Movie',
          type: 'movie',
          thumbnailUrl: null,
          externalUrl: 'https://example.com',
          source: 'netflix',
          fetchedAt: oldDate.toISOString(),
        },
      ],
      lastUpdated: oldDate.toISOString(),
      source: 'netflix-flixpatrol',
      healthy: true,
    };

    global.fetch = vi.fn().mockRejectedValueOnce(new Error('API error'));
    (getCategoryDataSmart as any).mockResolvedValueOnce(mockCachedData);

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.cached).toBe(true);
    expect(data.stale).toBe(true);
  });

  it('should validate data before storing', async () => {
    const mockHtml = `
      <html>
        <body>
          <h2>TOP 10 Movies</h2>
          <table class="card-table">
            <tr class="table-group">
              <td class="table-td">1. </td>
              <td><a href="/title/movie1/" class="hover:underline">Test Movie</a></td>
            </tr>
          </table>
          <h2>TOP 10 TV Shows</h2>
          <table class="card-table">
            <tr class="table-group">
              <td class="table-td">1. </td>
              <td><a href="/title/show1/" class="hover:underline">Test Show</a></td>
            </tr>
          </table>
        </body>
      </html>
    `;

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    });

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.validated).toBe(true);
    expect(storeCategoryDataSmart).toHaveBeenCalled();
  });

  it('should handle missing OMDB API key gracefully', async () => {
    process.env.OMDB_API_KEY = '';

    const mockHtml = `
      <html>
        <body>
          <h2>TOP 10 Movies</h2>
          <table class="card-table">
            <tr class="table-group">
              <td class="table-td">1. </td>
              <td><a href="/title/movie1/" class="hover:underline">Test Movie</a></td>
            </tr>
          </table>
          <h2>TOP 10 TV Shows</h2>
          <table class="card-table"></table>
        </body>
      </html>
    `;

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    });

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data[0].thumbnailUrl).toBeNull();
  });

  it('should combine top 5 movies and top 5 shows into 10 items', async () => {
    const mockHtml = `
      <html>
        <body>
          <h2>TOP 10 Movies</h2>
          <table class="card-table">
            <tr class="table-group"><td class="table-td">1. </td><td><a href="/title/m1/" class="hover:underline">M1</a></td></tr>
            <tr class="table-group"><td class="table-td">2. </td><td><a href="/title/m2/" class="hover:underline">M2</a></td></tr>
            <tr class="table-group"><td class="table-td">3. </td><td><a href="/title/m3/" class="hover:underline">M3</a></td></tr>
            <tr class="table-group"><td class="table-td">4. </td><td><a href="/title/m4/" class="hover:underline">M4</a></td></tr>
            <tr class="table-group"><td class="table-td">5. </td><td><a href="/title/m5/" class="hover:underline">M5</a></td></tr>
            <tr class="table-group"><td class="table-td">6. </td><td><a href="/title/m6/" class="hover:underline">M6</a></td></tr>
          </table>
          <h2>TOP 10 TV Shows</h2>
          <table class="card-table">
            <tr class="table-group"><td class="table-td">1. </td><td><a href="/title/s1/" class="hover:underline">S1</a></td></tr>
            <tr class="table-group"><td class="table-td">2. </td><td><a href="/title/s2/" class="hover:underline">S2</a></td></tr>
            <tr class="table-group"><td class="table-td">3. </td><td><a href="/title/s3/" class="hover:underline">S3</a></td></tr>
            <tr class="table-group"><td class="table-td">4. </td><td><a href="/title/s4/" class="hover:underline">S4</a></td></tr>
            <tr class="table-group"><td class="table-td">5. </td><td><a href="/title/s5/" class="hover:underline">S5</a></td></tr>
            <tr class="table-group"><td class="table-td">6. </td><td><a href="/title/s6/" class="hover:underline">S6</a></td></tr>
          </table>
        </body>
      </html>
    `;

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    });

    const response = await GET();
    const data = await response.json();

    expect(data.data).toHaveLength(10);
    // First 5 should be movies
    expect(data.data[0].type).toBe('movie');
    expect(data.data[4].type).toBe('movie');
    // Last 5 should be shows (ranks 6-10)
    expect(data.data[5].type).toBe('show');
    expect(data.data[9].type).toBe('show');
    expect(data.data[9].rank).toBe(10);
  });
});
