import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, fetchSteamTopSellers } from './route';
import { getCategoryDataSmart, storeCategoryDataSmart } from '@/lib/kv';
import type { SteamItem } from '@/lib/schemas';

// Mock KV functions
vi.mock('@/lib/kv', () => ({
  getCategoryDataSmart: vi.fn(),
  storeCategoryDataSmart: vi.fn(),
  KV_KEYS: {
    STEAM: 'trending_steam',
  },
}));

// Mock global fetch
global.fetch = vi.fn();

describe('Steam Fetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and transform Steam specials', async () => {
    const mockSteamResponse = {
      specials: {
        items: [
          {
            id: 730,
            name: 'Counter-Strike 2',
            final_price: 0,
            currency: 'VND',
            header_image: 'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
          },
          {
            id: 578080,
            name: 'PUBG: BATTLEGROUNDS',
            discounted: false,
            discount_percent: 0,
            final_price: 0,
            currency: 'VND',
            header_image: 'https://cdn.akamai.steamstatic.com/steam/apps/578080/header.jpg',
          },
          {
            id: 1245620,
            name: 'Elden Ring',
            discounted: true,
            discount_percent: 50,
            final_price: 29990000,
            currency: 'VND',
            header_image: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg',
          },
        ],
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSteamResponse,
    } as Response);

    const items = await fetchSteamTopSellers();

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      rank: 1,
      title: 'Counter-Strike 2',
      artist: 'Free to Play',
      source: 'steam',
      externalUrl: 'https://store.steampowered.com/app/730',
    });
    expect(items[1].artist).toBe('Free to Play');
    // Discounted VND game: price + discount suffix
    expect(items[2].artist).toBe('299.900đ (-50%)');
    expect(items[0].thumbnailUrl).toBe('https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg');
  });

  it('should format prices correctly', async () => {
    const mockSteamResponse = {
      specials: {
        items: [
          { id: 1, name: 'Free Game', final_price: 0, currency: 'VND' },
          { id: 2, name: 'Discounted VND Game', discounted: true, discount_percent: 25, final_price: 49990000, currency: 'VND' },
          { id: 3, name: 'Regular VND Game', discounted: false, final_price: 19990000, currency: 'VND' },
          { id: 4, name: 'USD Game', final_price: 1999, currency: 'USD' },
          { id: 5, name: 'No Price', final_price: null },
        ],
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSteamResponse,
    } as Response);

    const items = await fetchSteamTopSellers();

    expect(items[0].artist).toBe('Free to Play');
    // VND with discount: formatted price + discount suffix
    expect(items[1].artist).toBe('499.900đ (-25%)');
    // VND without discount: just formatted price
    expect(items[2].artist).toBe('199.900đ');
    // USD formatted as $XX.XX
    expect(items[3].artist).toBe('$19.99');
    expect(items[4].artist).toBe('View Price');
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
    } as Response);

    vi.mocked(getCategoryDataSmart).mockResolvedValueOnce({
      items: [
        {
          rank: 1,
          title: 'Cached Game',
          artist: '$19.99',
          thumbnailUrl: null,
          externalUrl: 'https://store.steampowered.com/app/1',
          source: 'steam',
          fetchedAt: new Date().toISOString(),
        },
      ],
      lastUpdated: new Date().toISOString(),
      source: 'steam-api',
      healthy: true,
    });

    const response = await GET();
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.cached).toBe(true);
    expect(json.error).toContain('503');
  });

  it('should return 500 when everything fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
    vi.mocked(getCategoryDataSmart).mockResolvedValueOnce(null);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
  });

  it('should mark cache as stale when older than 7 days', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    vi.mocked(getCategoryDataSmart).mockResolvedValueOnce({
      items: [
        {
          rank: 1,
          title: 'Old Game',
          artist: '$19.99',
          thumbnailUrl: null,
          externalUrl: 'https://store.steampowered.com/app/1',
          source: 'steam',
          fetchedAt: eightDaysAgo.toISOString(),
        },
      ],
      lastUpdated: eightDaysAgo.toISOString(),
      source: 'steam-api',
      healthy: true,
    });

    const response = await GET();
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.stale).toBe(true);
  });

  it('should store data after successful fetch', async () => {
    const mockSteamResponse = {
      specials: {
        items: [
          {
            id: 730,
            name: 'Counter-Strike 2',
            final_price: 0,
            header_image: 'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
          },
        ],
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSteamResponse,
    } as Response);

    const response = await GET();
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(storeCategoryDataSmart).toHaveBeenCalledWith(
      'trending_steam',
      expect.objectContaining({
        items: expect.any(Array),
        source: 'steam-api',
        healthy: true,
      })
    );
  });

  it('should handle empty specials response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ specials: { items: [] } }),
    } as Response);

    vi.mocked(getCategoryDataSmart).mockResolvedValueOnce(null);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
  });
});
