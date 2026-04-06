import { NextResponse } from 'next/server';
import { storeCategoryDataSmart, getCategoryDataSmart, KV_KEYS } from '@/lib/kv';
import { sanitizeTrendingItems } from '@/lib/validation';
import type { CategoryData } from '@/lib/schemas';
import googleTrends from 'google-trends-api';

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

// Fetch from Google Trends API (free, unofficial)
async function fetchFromGoogleTrends(): Promise<GoogleTrendItem[]> {
  try {
    // Get daily trending searches for Vietnam
    const results = await googleTrends.dailyTrends({
      geo: 'VN',
    });

    const parsed = JSON.parse(results);
    const trendingDays = parsed.default.trendingSearchesDays;
    
    if (!trendingDays || trendingDays.length === 0) {
      throw new Error('No trending data found in Google Trends response');
    }

    // Get today's trends (first day in the array)
    const todayTrends = trendingDays[0].trendingSearches;
    
    if (!todayTrends || todayTrends.length === 0) {
      throw new Error('No trends found for today');
    }

    // Transform to our format
    return todayTrends.slice(0, 10).map((item: any, index: number) => {
      const title = item.title.query;
      const searchVolume = item.formattedTraffic || 'Trending';
      const thumbnail = item.image?.imageUrl || null;
      
      return {
        rank: index + 1,
        title: title,
        artist: searchVolume,
        thumbnailUrl: thumbnail,
        externalUrl: `https://www.google.com/search?q=${encodeURIComponent(title)}`,
        source: 'google',
        fetchedAt: new Date().toISOString(),
        searchVolume: searchVolume,
      };
    });
  } catch (error) {
    throw new Error(`Google Trends API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function GET() {
  try {
    let rawData: GoogleTrendItem[];
    
    // Try to fetch fresh data from Google Trends via free API
    try {
      rawData = await fetchFromGoogleTrends();
    } catch (error) {
      console.warn('[Google] Google Trends fetch failed, checking for cached data:', error);
      
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
      source: 'google-trends-api',
      healthy: true,
    };
    
    // Store in Redis/file cache
    await storeCategoryDataSmart(KV_KEYS.GOOGLE, categoryData);
    console.log('[Google] Data stored successfully');
    
    return NextResponse.json({
      success: true,
      data: validatedItems,
      source: 'google-trends-api',
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
