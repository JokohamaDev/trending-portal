import { NextResponse } from 'next/server';
import { storeCategoryDataSmart, getCategoryDataSmart, KV_KEYS } from '@/lib/kv';
import { sanitizeTrendingItems } from '@/lib/validation';
import type { CategoryData, TrendingItem } from '@/lib/schemas';

interface YouTubeVideo {
  rank: number;
  title: string;
  artist: string; // channel title
  thumbnailUrl: string | null;
  externalUrl: string;
  source: string;
  fetchedAt: string;
  videoId?: string;
  viewCount?: string;
}

interface YouTubeApiResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      channelTitle: string;
      thumbnails: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
      };
    };
    statistics?: {
      viewCount?: string;
    };
  }>;
  error?: {
    code: number;
    message: string;
  };
}

// Fetch from YouTube Data API v3
async function fetchFromYouTubeAPI(): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  console.log('[YouTube Debug] API Key exists:', !!apiKey);
  console.log('[YouTube Debug] API Key length:', apiKey?.length || 0);
  
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY environment variable not set');
  }

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=VN&maxResults=10&key=${apiKey}`,
    {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 0 }, // Don't cache - always fresh
    }
  );

  console.log('[YouTube Debug] API response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    console.log('[YouTube Debug] API error:', JSON.stringify(errorData));
    
    // Check for quota exceeded error
    if (errorData?.error?.code === 403 || 
        errorData?.error?.message?.includes('quota') ||
        errorData?.error?.message?.includes('Quota')) {
      throw new Error('QUOTA_EXCEEDED');
    }
    
    throw new Error(`YouTube API responded with ${response.status}: ${errorData?.error?.message || 'Unknown error'}`);
  }

  const data: YouTubeApiResponse = await response.json();
  
  if (!data.items || data.items.length === 0) {
    throw new Error('No videos found in YouTube response');
  }

  return data.items.map((item, index) => ({
    rank: index + 1,
    title: item.snippet.title,
    artist: item.snippet.channelTitle,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url || 
                  item.snippet.thumbnails?.high?.url || 
                  item.snippet.thumbnails?.default?.url || null,
    externalUrl: `https://youtube.com/watch?v=${item.id}`,
    source: 'youtube',
    fetchedAt: new Date().toISOString(),
    videoId: item.id,
    viewCount: item.statistics?.viewCount,
  }));
}

export async function GET() {
  try {
    let rawData: YouTubeVideo[];
    
    // Try to fetch fresh data from YouTube API
    try {
      rawData = await fetchFromYouTubeAPI();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      
      // Check if it's a quota exceeded error
      if (errorMessage === 'QUOTA_EXCEEDED') {
        console.warn('[YouTube] Quota exceeded, returning cached data');
        
        // Return cached data with cached: true flag
        const cachedData = await getCategoryDataSmart(KV_KEYS.YOUTUBE);
        
        if (cachedData && cachedData.items.length > 0) {
          return NextResponse.json({
            success: true,
            data: cachedData.items,
            source: cachedData.source,
            cached: true,
            quotaExceeded: true,
            cachedAt: cachedData.lastUpdated,
          });
        }
        
        throw new Error('YouTube API quota exceeded and no cached data available');
      }
      
      throw error;
    }
    
    // Validate and sanitize data
    const validatedItems = sanitizeTrendingItems(rawData);
    
    if (validatedItems.length === 0) {
      throw new Error('All fetched data failed validation');
    }
    
    if (validatedItems.length < rawData.length) {
      console.warn(`[YouTube] Filtered ${rawData.length - validatedItems.length} invalid items`);
    }
    
    // Create category data structure
    const categoryData: CategoryData = {
      items: validatedItems,
      lastUpdated: new Date().toISOString(),
      source: 'youtube-api',
      healthy: true,
    };
    
    // Store in Redis/file cache
    await storeCategoryDataSmart(KV_KEYS.YOUTUBE, categoryData);
    console.log('[YouTube] Data stored successfully');
    
    return NextResponse.json({
      success: true,
      data: validatedItems,
      source: 'youtube-api',
      cached: false,
      validated: true,
      count: validatedItems.length,
    });
    
  } catch (error) {
    console.error('[YouTube] Failed to fetch:', error);
    
    // Try to return cached data from Redis/file
    const cachedData = await getCategoryDataSmart(KV_KEYS.YOUTUBE);
    
    if (cachedData && cachedData.items.length > 0) {
      // Check if cache is stale (older than 7 days)
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
        error: 'Failed to fetch YouTube trending',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: [],
      },
      { status: 500 }
    );
  }
}
