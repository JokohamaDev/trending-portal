import { NextResponse } from 'next/server';
import { storeCategoryDataSmart, getCategoryDataSmart, KV_KEYS } from '@/lib/kv';
import { sanitizeTrendingItems } from '@/lib/validation';
import type { CategoryData } from '@/lib/schemas';

interface GoogleTrendItem {
  rank: number;
  title: string;
  artist: string; // search volume or category
  thumbnailUrl: string | null;
  externalUrl: string;
  source: string;
  fetchedAt: string;
  searchVolume?: string;
}

interface SerpApiResponse {
  trending_searches: Array<{
    query: string;
    search_volume?: string;
    extracted_value?: number;
    thumbnail?: string;
  }>;
  error?: string;
}

// Fetch from SerpApi Google Trends
async function fetchFromSerpApi(): Promise<GoogleTrendItem[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  
  if (!apiKey) {
    throw new Error('SERPAPI_API_KEY environment variable not set');
  }

  // SerpApi Google Trends endpoint for Vietnam
  const params = new URLSearchParams({
    engine: 'google_trends_trending_now',
    hl: 'vi',
    geo: 'VN',
    api_key: apiKey,
  });

  const response = await fetch(
    `https://serpapi.com/search?${params.toString()}`,
    {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SerpApi responded with ${response.status}: ${errorText}`);
  }

  const data: SerpApiResponse = await response.json();
  
  if (data.error) {
    throw new Error(`SerpApi error: ${data.error}`);
  }
  
  if (!data.trending_searches || data.trending_searches.length === 0) {
    throw new Error('No trending searches found in SerpApi response');
  }

  // Transform SerpApi data to our format
  return data.trending_searches.slice(0, 10).map((item, index) => ({
    rank: index + 1,
    title: item.query,
    artist: item.search_volume ? `${item.search_volume} searches` : 'Trending',
    thumbnailUrl: item.thumbnail || null,
    externalUrl: `https://www.google.com/search?q=${encodeURIComponent(item.query)}`,
    source: 'google',
    fetchedAt: new Date().toISOString(),
    searchVolume: item.search_volume,
  }));
}

export async function GET() {
  try {
    let rawData: GoogleTrendItem[];
    
    // Try to fetch fresh data from Google Trends via SerpApi
    try {
      rawData = await fetchFromSerpApi();
    } catch (error) {
      console.warn('[Google] SerpApi fetch failed, checking for cached data:', error);
      
      // Return cached data if available
      const cachedData = await getCategoryDataSmart(KV_KEYS.GOOGLE);
      
      if (cachedData && cachedData.items.length > 0) {
        const cacheAge = Date.now() - new Date(cachedData.lastUpdated).getTime();
        const isStale = cacheAge > 7 * 24 * 60 * 60 * 1000;
        
        return NextResponse.json({
          success: true,
          data: cachedData.items,
          source: cachedData.source,
          cached: true,
          stale: isStale,
          cachedAt: cachedData.lastUpdated,
          warning: 'Using cached data - Google Trends API may be temporarily unavailable',
        });
      }
      
      throw error;
    }
    
    // Validate and sanitize data
    const validatedItems = sanitizeTrendingItems(rawData);
    
    if (validatedItems.length === 0) {
      throw new Error('All fetched data failed validation');
    }
    
    if (validatedItems.length < rawData.length) {
      console.warn(`[Google] Filtered ${rawData.length - validatedItems.length} invalid items`);
    }
    
    // Create category data structure
    const categoryData: CategoryData = {
      items: validatedItems,
      lastUpdated: new Date().toISOString(),
      source: 'google-serpapi',
      healthy: true,
    };
    
    // Store in Redis/file cache
    await storeCategoryDataSmart(KV_KEYS.GOOGLE, categoryData);
    console.log('[Google] Data stored successfully');
    
    return NextResponse.json({
      success: true,
      data: validatedItems,
      source: 'google-serpapi',
      cached: false,
      validated: true,
      count: validatedItems.length,
    });
    
  } catch (error) {
    console.error('[Google] Failed to fetch:', error);
    
    // Try to return cached data from Redis/file
    const cachedData = await getCategoryDataSmart(KV_KEYS.GOOGLE);
    
    if (cachedData && cachedData.items.length > 0) {
      const cacheAge = Date.now() - new Date(cachedData.lastUpdated).getTime();
      const isStale = cacheAge > 7 * 24 * 60 * 60 * 1000;
      
      return NextResponse.json({
        success: true,
        data: cachedData.items,
        source: cachedData.source,
        cached: true,
        stale: isStale,
        cachedAt: cachedData.lastUpdated,
        error: error instanceof Error ? error.message : 'Fetch failed, using cached data',
      });
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch Google Trends',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: [],
      },
      { status: 500 }
    );
  }
}
