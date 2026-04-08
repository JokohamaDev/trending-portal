import { NextRequest, NextResponse } from 'next/server';
import { getCategoryDataSmart, storeCategoryDataSmart, KV_KEYS } from '@/lib/kv';
import { validateCategoryData } from '@/lib/validation';
import type { TrendsData, CategoryData } from '@/lib/schemas';

const CACHE_TTL_HOURS = 1;
const CACHE_TTL_MS = CACHE_TTL_HOURS * 60 * 60 * 1000;

function isDataStale(lastUpdated: string): boolean {
  const lastUpdateTime = new Date(lastUpdated).getTime();
  const now = Date.now();
  return now - lastUpdateTime > CACHE_TTL_MS;
}

function normalizeCategoryData(data: unknown): CategoryData | undefined {
  if (!data) return undefined;
  
  // If data is a string, parse it
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return undefined;
    }
  }
  
  // Validate the data
  const validation = validateCategoryData(data);
  if (validation.success) {
    return validation.data;
  }
  
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === '1';
    
    // Fetch all categories from Redis/file cache
    let [spotifyRaw, youtubeRaw, netflixRaw, googleRaw, newsRaw, steamRaw] = await Promise.all([
      getCategoryDataSmart(KV_KEYS.SPOTIFY),
      getCategoryDataSmart(KV_KEYS.YOUTUBE),
      getCategoryDataSmart(KV_KEYS.NETFLIX),
      getCategoryDataSmart(KV_KEYS.GOOGLE),
      getCategoryDataSmart(KV_KEYS.NEWS),
      getCategoryDataSmart(KV_KEYS.STEAM),
    ]);
    
    // If refresh requested or cache empty, fetch fresh data directly
    if (refresh || !newsRaw) {
      try {
        const { fetchFromTuoiTreRSS } = await import('../fetchers/news/route');
        const newsItems = await fetchFromTuoiTreRSS();
        if (newsItems && newsItems.length > 0) {
          newsRaw = {
            items: newsItems,
            lastUpdated: new Date().toISOString(),
            source: 'tuoitre-rss',
            healthy: true,
          };
          // Store fresh data to cache
          await storeCategoryDataSmart(KV_KEYS.NEWS, newsRaw);
        }
      } catch {
        // News fetch failed, will use cache if available
      }
    }

    // If Netflix cache is empty or has no thumbnails, fetch directly
    const hasNoThumbnails = netflixRaw?.items?.every((item: any) => !item.thumbnailUrl);
    if (!netflixRaw || hasNoThumbnails) {
      try {
        const { GET: netflixGET } = await import('../fetchers/netflix/route');
        const netflixRes = await netflixGET();
        const netflixData = await netflixRes.json();
        if (netflixData.success && netflixData.data?.length > 0) {
          netflixRaw = {
            items: netflixData.data,
            lastUpdated: new Date().toISOString(),
            source: netflixData.source,
            healthy: true,
          };
        }
      } catch {
        // Netflix fetch failed, will remain unavailable
      }
    }

    // If refresh requested or Google cache empty, fetch fresh data directly
    if (refresh || !googleRaw) {
      try {
        const { GET: googleGET } = await import('../fetchers/google/route');
        const googleRes = await googleGET();
        const googleData = await googleRes.json();
        if (googleData.success && googleData.data?.length > 0) {
          googleRaw = {
            items: googleData.data,
            lastUpdated: new Date().toISOString(),
            source: googleData.source,
            healthy: true,
          };
        }
      } catch {
        // Google fetch failed, will use cache if available
      }
    }

    // Normalize and validate data
    const spotify = normalizeCategoryData(spotifyRaw);
    const youtube = normalizeCategoryData(youtubeRaw);
    const google = normalizeCategoryData(googleRaw);
    const news = normalizeCategoryData(newsRaw);
    const steam = normalizeCategoryData(steamRaw);
    
    // For Netflix, use direct data if available, otherwise try validation
    let netflix: CategoryData | undefined;
    if (netflixRaw) {
      netflix = normalizeCategoryData(netflixRaw);
      if (!netflix) {
        netflix = netflixRaw;
      }
    }

    const categories: TrendsData = {
      spotify: spotify || undefined,
      youtube: youtube || undefined,
      netflix: netflix || undefined,
      google: google || undefined,
      news: news || undefined,
      steam: steam || undefined,
      lastUpdated: new Date().toISOString(),
    };

    // Calculate source health
    const sourceHealth: Record<string, { available: boolean; stale: boolean }> = {};
    const categoryMap: Record<string, CategoryData | undefined> = {
      spotify,
      youtube,
      netflix,
      google,
      news,
      steam,
    };
    
    for (const [key, data] of Object.entries(categoryMap)) {
      sourceHealth[key] = {
        available: !!data && data.items.length > 0,
        stale: data ? isDataStale(data.lastUpdated) : false,
      };
    }

    return NextResponse.json(
      {
        success: true,
        data: categories,
        sourceHealth,
        meta: {
          totalCategories: Object.values(categoryMap).filter(Boolean).length,
          healthyCategories: Object.values(sourceHealth).filter(s => s.available && !s.stale).length,
          staleCategories: Object.values(sourceHealth).filter(s => s.stale).length,
          lastUpdated: categories.lastUpdated,
        },
      },
      {
        headers: refresh ? {
          'Cache-Control': 'no-store',
        } : {
          'Cache-Control': 'public, max-age=21600, stale-while-revalidate=43200',
        }
      }
    );

  } catch (error) {
    console.error('[Trends] Failed to fetch trends:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch trends data',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: {},
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        }
      }
    );
  }
}
