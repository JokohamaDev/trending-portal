import { NextResponse } from 'next/server';
import { storeCategoryDataSmart, getCategoryDataSmart, KV_KEYS } from '@/lib/kv';
import { sanitizeTrendingItems } from '@/lib/validation';
import type { CategoryData } from '@/lib/schemas';

interface NetflixItem {
  rank: number;
  title: string;
  artist: string; // category/type info
  thumbnailUrl: string | null;
  externalUrl: string;
  source: string;
  fetchedAt: string;
  type?: 'movie' | 'show';
}

// Fetch from Apify Netflix Top 10 actor
async function fetchFromNetflixApify(): Promise<NetflixItem[]> {
  const apiToken = process.env.APIFY_API_TOKEN;
  
  if (!apiToken) {
    throw new Error('APIFY_API_TOKEN environment variable not set');
  }

  // Run the Apify actor for Netflix Top 10
  const runResponse = await fetch('https://api.apify.com/v2/acts/netflix-top-10/run-sync-get-dataset-items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      country: 'vietnam',
      maxResults: 10,
    }),
    next: { revalidate: 3600 },
  });

  if (!runResponse.ok) {
    const errorText = await runResponse.text();
    throw new Error(`Apify responded with ${runResponse.status}: ${errorText}`);
  }

  const data = await runResponse.json();
  
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No Netflix data found in Apify response');
  }

  // Transform Apify data to our format
  // Note: The actual structure depends on the specific Apify actor used
  return data.slice(0, 10).map((item: {
    name?: string;
    title?: string;
    rank?: number;
    type?: 'movie' | 'show';
    image?: string;
    url?: string;
    category?: string;
  }, index: number) => ({
    rank: item.rank || index + 1,
    title: item.name || item.title || 'Unknown Title',
    artist: item.category || (item.type === 'movie' ? 'Movie' : 'TV Show'),
    thumbnailUrl: item.image || null,
    externalUrl: item.url || `https://www.netflix.com/title/${item.rank || index}`,
    source: 'netflix',
    fetchedAt: new Date().toISOString(),
    type: item.type || 'show',
  }));
}

export async function GET() {
  try {
    let rawData: NetflixItem[];
    
    // Try to fetch fresh data from Netflix via Apify
    try {
      rawData = await fetchFromNetflixApify();
    } catch (error) {
      console.warn('[Netflix] Apify fetch failed, checking for cached data:', error);
      
      // Return cached data if available
      const cachedData = await getCategoryDataSmart(KV_KEYS.NETFLIX);
      
      if (cachedData && cachedData.items.length > 0) {
        const cacheAge = Date.now() - new Date(cachedData.lastUpdated).getTime();
        const isStale = cacheAge > 7 * 24 * 60 * 60 * 1000;
        
        return NextResponse.json({
          success: true,
          data: cachedData.items,
          source: cachedData.source,
          cached: true,
          stale: isStale,
          experimental: true,
          cachedAt: cachedData.lastUpdated,
          warning: 'Using cached data - Netflix scraping may be temporarily unavailable',
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
      console.warn(`[Netflix] Filtered ${rawData.length - validatedItems.length} invalid items`);
    }
    
    // Create category data structure
    const categoryData: CategoryData = {
      items: validatedItems,
      lastUpdated: new Date().toISOString(),
      source: 'netflix-apify',
      healthy: true,
    };
    
    // Store in Redis/file cache
    await storeCategoryDataSmart(KV_KEYS.NETFLIX, categoryData);
    console.log('[Netflix] Data stored successfully');
    
    return NextResponse.json({
      success: true,
      data: validatedItems,
      source: 'netflix-apify',
      cached: false,
      validated: true,
      experimental: true,
      count: validatedItems.length,
    });
    
  } catch (error) {
    console.error('[Netflix] Failed to fetch:', error);
    
    // Try to return cached data from Redis/file
    const cachedData = await getCategoryDataSmart(KV_KEYS.NETFLIX);
    
    if (cachedData && cachedData.items.length > 0) {
      const cacheAge = Date.now() - new Date(cachedData.lastUpdated).getTime();
      const isStale = cacheAge > 7 * 24 * 60 * 60 * 1000;
      
      return NextResponse.json({
        success: true,
        data: cachedData.items,
        source: cachedData.source,
        cached: true,
        stale: isStale,
        experimental: true,
        cachedAt: cachedData.lastUpdated,
        error: error instanceof Error ? error.message : 'Fetch failed, using cached data',
      });
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch Netflix Top 10',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: [],
        experimental: true,
      },
      { status: 500 }
    );
  }
}
