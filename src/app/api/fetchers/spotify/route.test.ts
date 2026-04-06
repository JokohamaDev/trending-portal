import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the KV module
vi.mock('@/lib/kv', () => ({
  storeCategoryDataSmart: vi.fn(),
  getCategoryDataSmart: vi.fn(),
  KV_KEYS: {
    SPOTIFY: 'spotify',
  },
}));

// Mock the validation module
vi.mock('@/lib/validation', () => ({
  sanitizeTrendingItems: vi.fn((items: unknown[]) => items),
}));

import { GET } from './route';
import { storeCategoryDataSmart, getCategoryDataSmart } from '@/lib/kv';

describe('Spotify Fetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  const mockSpotifyApiResponse = {
    chartEntryViewResponses: [
      {
        entries: [
          {
            chartEntryData: { currentRank: 1 },
            trackMetadata: {
              trackName: 'Test Song',
              artists: [{ name: 'Test Artist' }],
              displayImageUri: 'https://image.com/test.jpg',
              trackUri: 'spotify:track:123',
            },
          },
          {
            chartEntryData: { currentRank: 2 },
            trackMetadata: {
              trackName: 'Another Song',
              artists: [{ name: 'Another Artist' }],
              trackUri: 'spotify:track:456',
            },
          },
        ],
      },
    ],
  };

  it('should fetch and transform Spotify API data', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSpotifyApiResponse,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.source).toBe('spotify-api');
    expect(data.data).toHaveLength(2);
    expect(data.data[0]).toMatchObject({
      rank: 1,
      title: 'Test Song',
      artist: 'Test Artist',
      thumbnailUrl: 'https://image.com/test.jpg',
      externalUrl: 'https://open.spotify.com/track/123',
      source: 'spotify',
    });
    expect(data.data[1]).toMatchObject({
      rank: 2,
      title: 'Another Song',
      source: 'spotify',
    });
    expect(storeCategoryDataSmart).toHaveBeenCalledWith('spotify', expect.any(Object));
  });

  it('should fallback to Kworb when Spotify API fails', async () => {
    const kworbHtml = `
      <table>
        <tr><td>1</td><td><a>Song 1</a></td><td>Artist 1</td></tr>
        <tr><td>2</td><td><a>Song 2</a></td><td>Artist 2</td></tr>
      </table>
    `;

    (global.fetch as any)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce({
        ok: true,
        text: async () => kworbHtml,
      });

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.source).toBe('kworb');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should use cached data when both sources fail', async () => {
    const cachedData = {
      items: [
        {
          rank: 1,
          title: 'Cached Song',
          artist: 'Cached Artist',
          thumbnailUrl: null,
          externalUrl: 'https://spotify.com',
          source: 'spotify',
          fetchedAt: new Date().toISOString(),
        },
      ],
      lastUpdated: new Date().toISOString(),
      source: 'spotify-api',
      healthy: true,
    };

    (global.fetch as any)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockRejectedValueOnce(new Error('Kworb Error'));
    
    (getCategoryDataSmart as any).mockResolvedValueOnce(cachedData);

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.cached).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].title).toBe('Cached Song');
  });

  it('should return 500 when everything fails', async () => {
    (global.fetch as any)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockRejectedValueOnce(new Error('Kworb Error'));
    
    (getCategoryDataSmart as any).mockResolvedValueOnce(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to fetch Spotify charts');
  });

  it('should mark cache as stale when older than 7 days', async () => {
    const oldCache = {
      items: [{ title: 'Old Song' }],
      lastUpdated: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'spotify-api',
      healthy: true,
    };

    (global.fetch as any)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockRejectedValueOnce(new Error('Kworb Error'));
    
    (getCategoryDataSmart as any).mockResolvedValueOnce(oldCache);

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.cached).toBe(true);
    expect(data.stale).toBe(true);
  });
});
