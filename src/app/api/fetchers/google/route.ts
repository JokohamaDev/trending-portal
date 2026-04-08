import { NextResponse } from 'next/server';
import { storeCategoryDataSmart, getCategoryDataSmart, KV_KEYS } from '@/lib/kv';
import { sanitizeTrendingItems } from '@/lib/validation';
import type { CategoryData } from '@/lib/schemas';

interface GoogleTrendItem {
  rank: number;
  title: string;
  artist: string;
  thumbnailUrl: string | null;
  externalUrl: string;
  source: string;
  fetchedAt: string;
}

// Parse Google Trends RSS feed (free, official)
export async function fetchFromGoogleTrendsRSS(): Promise<GoogleTrendItem[]> {
  // Google Trends RSS for Vietnam - official feed
  const rssUrl = 'https://trends.google.com/trending/rss?geo=VN';
  
  const response = await fetch(rssUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    next: { revalidate: 1800 }, // 30 minutes
  });

  if (!response.ok) {
    throw new Error(`Google Trends RSS responded with ${response.status}`);
  }

  const xml = await response.text();
  
  // Extract items from RSS XML - parse each item block independently
  const items: GoogleTrendItem[] = [];
  
  // Split by item tags and process each
  const itemBlocks = xml.split('<item>').slice(1); // Skip content before first item
  
  for (let i = 0; i < itemBlocks.length && items.length < 10; i++) {
    const block = itemBlocks[i];
    const endIndex = block.indexOf('</item>');
    if (endIndex === -1) continue;
    
    const itemContent = block.substring(0, endIndex);
    
    // Extract fields using regex - order doesn't matter
    const titleMatch = itemContent.match(/<title>([^<]*)<\/title>/);
    const trafficMatch = itemContent.match(/<ht:approx_traffic>([^<]*)<\/ht:approx_traffic>/);
    const pictureMatch = itemContent.match(/<ht:picture>([^<]*)<\/ht:picture>/);
    const urlMatch = itemContent.match(/<ht:news_item_url>([^<]*)<\/ht:news_item_url>/);
    
    if (titleMatch && trafficMatch) {
      items.push({
        rank: items.length + 1,
        title: titleMatch[1].trim(),
        artist: trafficMatch[1].trim(),
        thumbnailUrl: pictureMatch ? pictureMatch[1].trim() : null,
        externalUrl: urlMatch ? urlMatch[1].trim() : `https://www.google.com/search?q=${encodeURIComponent(titleMatch[1].trim())}`,
        source: 'google',
        fetchedAt: new Date().toISOString(),
      });
    }
  }

  if (items.length === 0) {
    throw new Error('No items found in Google Trends RSS feed');
  }

  return items;
}

export async function GET() {
  try {
    let rawData: GoogleTrendItem[];
    
    // Try to fetch fresh data from Google Trends via RSS
    try {
      rawData = await fetchFromGoogleTrendsRSS();
    } catch (error) {
      console.warn('[Google] RSS fetch failed, checking for cached data:', error);
      
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
      source: 'google-trends-rss',
      healthy: true,
    };
    
    // Store in Redis/file cache
    await storeCategoryDataSmart(KV_KEYS.GOOGLE, categoryData);
    console.log('[Google] Data stored successfully');
    
    return NextResponse.json({
      success: true,
      data: validatedItems,
      source: 'google-trends-rss',
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
