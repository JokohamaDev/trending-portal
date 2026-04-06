import { NextResponse } from 'next/server';
import { storeCategoryDataSmart, getCategoryDataSmart, KV_KEYS } from '@/lib/kv';
import { sanitizeTrendingItems } from '@/lib/validation';
import type { CategoryData, TrendingItem } from '@/lib/schemas';

interface SpotifyChartEntry {
  rank: number;
  title: string;
  artist: string;
  thumbnailUrl: string | null;
  externalUrl: string;
  source: string;
  fetchedAt: string;
}

interface SpotifyChartResponse {
  chartEntryViewResponses: Array<{
    entries: Array<{
      chartEntryData: {
        currentRank: number;
      };
      trackMetadata: {
        trackName: string;
        artists: Array<{ name: string }>;
        displayImageUri?: string;
        trackUri: string;
      };
    }>;
  }>;
}

// Primary source: Spotify public charts API
async function fetchFromSpotifyAPI(): Promise<SpotifyChartEntry[]> {
  const response = await fetch(
    'https://charts-spotify-com-service.spotify.com/public/v0/charts',
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    }
  );

  if (!response.ok) {
    throw new Error(`Spotify API responded with ${response.status}`);
  }

  const data: SpotifyChartResponse = await response.json();
  
  // Find Vietnam daily chart (usually the first entry with VN region)
  const vnChart = data.chartEntryViewResponses?.find(chart => 
    chart.entries?.[0]?.trackMetadata?.trackUri?.includes('VN') ||
    chart.entries?.length > 0
  );

  if (!vnChart || !vnChart.entries) {
    throw new Error('No Vietnam chart data found in Spotify response');
  }

  return vnChart.entries.slice(0, 10).map((entry) => ({
    rank: entry.chartEntryData.currentRank,
    title: entry.trackMetadata.trackName,
    artist: entry.trackMetadata.artists.map((a) => a.name).join(', '),
    thumbnailUrl: entry.trackMetadata.displayImageUri || null,
    externalUrl: `https://open.spotify.com/track/${entry.trackMetadata.trackUri.replace('spotify:track:', '')}`,
    source: 'spotify',
    fetchedAt: new Date().toISOString(),
  }));
}

// Fallback: Scrape from Kworb.net Vietnam daily chart
async function fetchFromKworb(): Promise<SpotifyChartEntry[]> {
  const response = await fetch('https://kworb.net/spotify/country/vn_daily.html', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Kworb responded with ${response.status}`);
  }

  const html = await response.text();
  
  // Parse the HTML table for chart entries
  const entries: SpotifyChartEntry[] = [];
  const rowRegex = /<tr[^>]*>.*?<td[^>]*>(\d+)<\/td>.*?<td[^>]*>.*?<a[^>]*>([^<]*)<\/a>.*?<td[^>]*>([^<]*)<\/td>.*?<\/tr>/gs;
  
  let match;
  while ((match = rowRegex.exec(html)) !== null && entries.length < 10) {
    const rank = parseInt(match[1], 10);
    const title = match[2].trim();
    const artist = match[3].trim();
    
    if (title && artist) {
      entries.push({
        rank,
        title,
        artist,
        thumbnailUrl: null,
        externalUrl: `https://open.spotify.com/search/${encodeURIComponent(title + ' ' + artist)}`,
        source: 'spotify-kworb',
        fetchedAt: new Date().toISOString(),
      });
    }
  }

  if (entries.length === 0) {
    throw new Error('Failed to parse Kworb chart data');
  }

  return entries;
}

export async function GET() {
  try {
    let rawData: SpotifyChartEntry[];
    let fetchSource: string;
    
    // Try to fetch fresh data
    try {
      rawData = await fetchFromSpotifyAPI();
      fetchSource = 'spotify-api';
    } catch (spotifyError) {
      console.warn('[Spotify] API failed, trying Kworb fallback:', spotifyError);
      rawData = await fetchFromKworb();
      fetchSource = 'kworb';
    }
    
    // Validate and sanitize data
    const validatedItems = sanitizeTrendingItems(rawData);
    
    if (validatedItems.length === 0) {
      throw new Error('All fetched data failed validation');
    }
    
    if (validatedItems.length < rawData.length) {
      console.warn(`[Spotify] Filtered ${rawData.length - validatedItems.length} invalid items`);
    }
    
    // Create category data structure
    const categoryData: CategoryData = {
      items: validatedItems,
      lastUpdated: new Date().toISOString(),
      source: fetchSource,
      healthy: true,
    };
    
    // Store in Redis/file cache
    await storeCategoryDataSmart(KV_KEYS.SPOTIFY, categoryData);
    console.log('[Spotify] Data stored successfully');
    
    return NextResponse.json({
      success: true,
      data: validatedItems,
      source: fetchSource,
      cached: false,
      validated: true,
      count: validatedItems.length,
    });
    
  } catch (error) {
    console.error('[Spotify] Both sources failed:', error);
    
    // Try to return cached data from Redis/file
    const cachedData = await getCategoryDataSmart(KV_KEYS.SPOTIFY);
    
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
        error: 'Failed to fetch Spotify charts',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: [],
      },
      { status: 500 }
    );
  }
}
