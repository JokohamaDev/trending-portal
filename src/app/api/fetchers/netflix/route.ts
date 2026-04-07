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

// Fetch thumbnail from OMDB API
async function fetchThumbnailFromOMDB(title: string, type: 'movie' | 'show'): Promise<string | null> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey || apiKey === 'your-omdb-api-key') {
    return null;
  }
  
  try {
    const typeParam = type === 'movie' ? 'movie' : 'series';
    const encodedTitle = encodeURIComponent(title);
    const url = `https://www.omdbapi.com/?t=${encodedTitle}&type=${typeParam}&apikey=${apiKey}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 86400 }, // Cache for 1 day
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.Response === 'True' && data.Poster && data.Poster !== 'N/A') {
      return data.Poster;
    }
    
    return null;
  } catch (error) {
    console.warn(`[Netflix/OMDB] Failed to fetch thumbnail for ${title}:`, error);
    return null;
  }
}

// Fetch thumbnails for all items in parallel
async function enrichWithThumbnails(items: NetflixItem[]): Promise<NetflixItem[]> {
  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      const thumbnailUrl = await fetchThumbnailFromOMDB(item.title, item.type || 'show');
      return {
        ...item,
        thumbnailUrl,
      };
    })
  );
  
  return enrichedItems;
}

// Fetch from FlixPatrol Netflix Vietnam - get top 5 Movies + top 5 TV Shows
async function fetchFromFlixPatrol(): Promise<NetflixItem[]> {
  const url = 'https://flixpatrol.com/top10/netflix/vietnam/';
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`FlixPatrol responded with ${response.status}`);
  }

  const html = await response.text();
  
  // Parse a single table - look for rank 1-10 items
  // The page has TWO separate tables: one for Movies, one for TV Shows
  const parseTable = (tableHtml: string, type: 'movie' | 'show'): NetflixItem[] => {
    const items: NetflixItem[] = [];
    
    // Match table rows with rank and title
    const rowRegex = /<tr[^>]*class="[^"]*table-group[^"]*"[^>]*>[\s\S]*?<td[^>]*class="[^"]*table-td[^"]*"[^>]*>\s*(\d+)\.\s*<\/td>[\s\S]*?<a[^>]*href="\/title\/([^"]*)\/"[^>]*class="[^"]*hover:underline[^"]*"[^>]*>([^<]+)<\/a>[\s\S]*?<\/tr>/gi;
    
    let match;
    while ((match = rowRegex.exec(tableHtml)) !== null) {
      const rank = parseInt(match[1], 10);
      const titleSlug = match[2];
      const title = match[3].trim();
      
      if (rank && title && rank <= 10) {
        const rowSnippet = tableHtml.substring(match.index, match.index + 400);
        const isNetflixOriginal = rowSnippet.includes('Netflix original');
        
        items.push({
          rank,
          title,
          artist: type === 'movie' ? 'Movie' : 'TV Show',
          thumbnailUrl: null,
          externalUrl: `https://www.netflix.com/title/${titleSlug}`,
          source: 'netflix',
          fetchedAt: new Date().toISOString(),
          type,
        });
      }
    }
    
    return items.sort((a, b) => a.rank - b.rank).slice(0, 5); // Take top 5
  };
  
  // Find the two main tables - they appear after their headers
  // Movies table comes first, then TV Shows table
  const moviesMatch = html.match(/TOP 10 Movies[\s\S]*?<table[^>]*class="[^"]*card-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  const showsMatch = html.match(/TOP 10 TV Shows[\s\S]*?<table[^>]*class="[^"]*card-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  
  const movies = moviesMatch ? parseTable(moviesMatch[1], 'movie') : [];
  const shows = showsMatch ? parseTable(showsMatch[1], 'show') : [];
  
  // Combine: movies rank 1-5, shows rank 6-10
  const combined: NetflixItem[] = [
    ...movies.map(m => ({ ...m, rank: m.rank })), // Keep 1-5
    ...shows.map((s, idx) => ({ ...s, rank: idx + 6 })), // 6-10
  ];
  
  if (combined.length === 0) {
    throw new Error('Could not parse Netflix Top 10 from FlixPatrol');
  }
  
  return combined.slice(0, 10);
}

export async function GET() {
  try {
    // Try to fetch fresh data from Netflix via FlixPatrol
    let rawData = await fetchFromFlixPatrol();
    
    if (rawData.length === 0) {
      throw new Error('No data found from FlixPatrol');
    }
    
    // Enrich with OMDB thumbnails (optional, continues without thumbnails if OMDB fails)
    try {
      rawData = await enrichWithThumbnails(rawData);
      const thumbnailsFound = rawData.filter(i => i.thumbnailUrl).length;
      console.log(`[Netflix/OMDB] Found thumbnails for ${thumbnailsFound}/${rawData.length} items`);
    } catch (thumbError) {
      console.warn('[Netflix/OMDB] Thumbnail fetching failed:', thumbError);
      // Continue without thumbnails
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
      source: 'netflix-flixpatrol',
      healthy: true,
    };
    
    // Store in Redis/file cache
    await storeCategoryDataSmart(KV_KEYS.NETFLIX, categoryData);
    console.log(`[Netflix] Data stored: ${rawData.filter(i => i.type === 'movie').length} movies, ${rawData.filter(i => i.type === 'show').length} shows`);
    
    return NextResponse.json({
      success: true,
      data: validatedItems,
      source: 'netflix-flixpatrol',
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
