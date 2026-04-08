import { NextResponse } from 'next/server';
import { storeCategoryDataSmart, getCategoryDataSmart, KV_KEYS } from '@/lib/kv';
import type { TrendingItem, SteamItem } from '@/lib/schemas';

interface SteamFeaturedCategoriesResponse {
  specials?: {
    items?: SteamGameItem[];
  };
}

interface SteamGameItem {
  id: number;
  name: string;
  discounted?: boolean;
  discount_percent?: number;
  original_price?: number | null;
  final_price?: number;
  currency?: string;
  tiny_image?: string;
  small_capsule_image?: string;
  header_image?: string;
}

export interface SteamFetcherResult {
  success: boolean;
  data?: SteamItem[];
  source?: string;
  cached?: boolean;
  stale?: boolean;
  error?: string;
}

// Fetch special offers from Steam Store API (free, no auth required)
export async function fetchSteamTopSellers(): Promise<SteamItem[]> {
  // Steam Store API for featured categories - includes specials
  const apiUrl = 'https://store.steampowered.com/api/featuredcategories/?cc=VN';

  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'application/json',
    },
    next: { revalidate: 3600 }, // 1 hour cache
  });

  if (!response.ok) {
    throw new Error(`Steam API responded with ${response.status}`);
  }

  const data: SteamFeaturedCategoriesResponse = await response.json();
  const specials = data.specials?.items;

  if (!specials || specials.length === 0) {
    throw new Error('No specials found in Steam response');
  }

  // Map Steam games to TrendingItem format (top 10)
  return specials.slice(0, 10).map((game, index): SteamItem => {
    // Format price for display with proper VND formatting
    let priceDisplay: string;
    if (game.final_price === 0) {
      priceDisplay = 'Free to Play';
    } else if (game.final_price && game.currency === 'VND') {
      // Steam prices are in cents, convert to VND
      const priceVND = Math.round(game.final_price / 100);
      const formattedPrice = priceVND.toLocaleString('vi-VN');
      // Add discount suffix if discounted
      if (game.discounted && game.discount_percent) {
        priceDisplay = `${formattedPrice}đ (-${game.discount_percent}%)`;
      } else {
        priceDisplay = `${formattedPrice}đ`;
      }
    } else if (game.final_price && game.currency) {
      // Other currencies
      const price = (game.final_price / 100).toFixed(2);
      priceDisplay = game.currency === 'USD' ? `$${price}` : `${price} ${game.currency}`;
    } else {
      priceDisplay = 'View Price';
    }

    return {
      rank: index + 1,
      title: game.name,
      artist: priceDisplay,
      thumbnailUrl: game.header_image || game.small_capsule_image || game.tiny_image || null,
      externalUrl: `https://store.steampowered.com/app/${game.id}`,
      source: 'steam',
      fetchedAt: new Date().toISOString(),
      appId: String(game.id),
    };
  });
}

export async function GET(): Promise<NextResponse<SteamFetcherResult>> {
  try {
    // Try to fetch fresh data from Steam
    let items: SteamItem[];
    try {
      items = await fetchSteamTopSellers();
    } catch (fetchError) {
      console.error('[Steam] Fetch failed:', fetchError);

      // Try to return cached data
      const cached = await getCategoryDataSmart(KV_KEYS.STEAM);
      if (cached && cached.items.length > 0) {
        const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
        const isStale = cacheAge > 7 * 24 * 60 * 60 * 1000; // 7 days

        return NextResponse.json({
          success: true,
          data: cached.items as SteamItem[],
          source: cached.source,
          cached: true,
          stale: isStale,
          error: fetchError instanceof Error ? fetchError.message : 'Fetch failed',
        });
      }

      // No cache available
      throw fetchError;
    }

    // Store fresh data to cache
    const categoryData = {
      items,
      lastUpdated: new Date().toISOString(),
      source: 'steam-api',
      healthy: true,
    };
    await storeCategoryDataSmart(KV_KEYS.STEAM, categoryData);

    return NextResponse.json({
      success: true,
      data: items,
      source: 'steam-api',
      cached: false,
    });
  } catch (error) {
    console.error('[Steam] GET failed:', error);

    // Try cached data one more time
    try {
      const cached = await getCategoryDataSmart(KV_KEYS.STEAM);
      if (cached && cached.items.length > 0) {
        const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
        const isStale = cacheAge > 7 * 24 * 60 * 60 * 1000;

        return NextResponse.json({
          success: true,
          data: cached.items as SteamItem[],
          source: cached.source,
          cached: true,
          stale: isStale,
          error: error instanceof Error ? error.message : 'Fetch failed',
        });
      }
    } catch (cacheError) {
      console.error('[Steam] Cache fallback failed:', cacheError);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Steam data',
      },
      { status: 500 }
    );
  }
}
