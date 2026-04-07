import { NextRequest, NextResponse } from 'next/server';
import { getCategoryDataSmart, KV_KEYS } from '@/lib/kv';
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
    let [spotifyRaw, youtubeRaw, netflixRaw, googleRaw] = await Promise.all([
      getCategoryDataSmart(KV_KEYS.SPOTIFY),
      getCategoryDataSmart(KV_KEYS.YOUTUBE),
      getCategoryDataSmart(KV_KEYS.NETFLIX),
      getCategoryDataSmart(KV_KEYS.GOOGLE),
    ]);
    
    // If Netflix cache is empty, fetch directly
    if (!netflixRaw) {
      console.log('[Trends] Netflix cache empty, attempting direct fetch...');
      try {
        // Import Netflix fetcher directly to avoid Vercel SSO blocking
        console.log('[Trends] Importing Netflix fetcher...');
        const netflixModule = await import('../fetchers/netflix/route');
        console.log('[Trends] Netflix module imported:', typeof netflixModule);
        
        if (!netflixModule.GET) {
          console.error('[Trends] Netflix module has no GET export');
        } else {
          console.log('[Trends] Calling Netflix GET...');
          const netflixRes = await netflixModule.GET();
          console.log('[Trends] Netflix GET returned, status:', netflixRes.status, 'ok:', netflixRes.ok);
          
          const netflixData = await netflixRes.json();
          console.log('[Trends] Netflix data parsed:', { success: netflixData.success, count: netflixData.data?.length, source: netflixData.source });
          
          if (netflixData.success && netflixData.data?.length > 0) {
            netflixRaw = {
              items: netflixData.data,
              lastUpdated: new Date().toISOString(),
              source: netflixData.source,
              healthy: true,
            };
            console.log('[Trends] Netflix data set to netflixRaw successfully');
          } else {
            console.log('[Trends] Netflix data invalid:', netflixData);
          }
        }
      } catch (e: any) {
        console.error('[Trends] Netflix fetch error:', e.message, e.stack);
      }
    } else {
      console.log('[Trends] Netflix cache found');
    }

    // Normalize and validate data
    const spotify = normalizeCategoryData(spotifyRaw);
    const youtube = normalizeCategoryData(youtubeRaw);
    const google = normalizeCategoryData(googleRaw);
    
    // For Netflix, use direct data if available, otherwise try validation
    let netflix: CategoryData | undefined;
    if (netflixRaw) {
      netflix = normalizeCategoryData(netflixRaw);
      if (!netflix) {
        console.log('[Trends] Netflix validation failed, using raw data');
        netflix = netflixRaw;
      }
    }

    const categories: TrendsData = {
      spotify: spotify || undefined,
      youtube: youtube || undefined,
      netflix: netflix || undefined,
      google: google || undefined,
      lastUpdated: new Date().toISOString(),
    };

    // Calculate source health
    const sourceHealth: Record<string, { available: boolean; stale: boolean }> = {};
    const categoryMap: Record<string, CategoryData | undefined> = {
      spotify,
      youtube,
      netflix,
      google,
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
