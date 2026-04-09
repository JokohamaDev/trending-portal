import { NextResponse, NextRequest } from 'next/server';
import { storeCategoryDataSmart, getCategoryDataSmart, KV_KEYS } from '@/lib/kv';
import { sanitizeTrendingItems } from '@/lib/validation';
import type { CategoryData } from '@/lib/schemas';

interface NewsItem {
  rank: number;
  title: string;
  artist: string;
  thumbnailUrl: string | null;
  externalUrl: string;
  source: string;
  fetchedAt: string;
}

// Parse Tuoi Tre RSS feed (free, no limits)
export async function fetchFromTuoiTreRSS(): Promise<NewsItem[]> {
  // Tuoi Tre RSS feed - multiple category options
  const rssUrl = 'https://tuoitre.vn/rss/tin-moi-nhat.rss';

  const response = await fetch(rssUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    next: { revalidate: 900 }, // 15 minutes
  });

  if (!response.ok) {
    throw new Error(`Tuoi Tre RSS responded with ${response.status}`);
  }

  const xml = await response.text();

  // Extract items from RSS XML
  const items: NewsItem[] = [];

  // Split by item tags and process each
  const itemBlocks = xml.split('<item>').slice(1); // Skip content before first item

  for (let i = 0; i < itemBlocks.length && items.length < 10; i++) {
    const block = itemBlocks[i];
    const endIndex = block.indexOf('</item>');
    if (endIndex === -1) continue;

    const itemContent = block.substring(0, endIndex);

    // Extract fields using regex - handle CDATA sections
    const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?([^\]]*)(?:\]\]>)?<\/title>/);
    const linkMatch = itemContent.match(/<link>(?:<!\[CDATA\[)?([^\]]*)(?:\]\]>)?<\/link>/);
    const descriptionMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
    const pubDateMatch = itemContent.match(/<pubDate>(?:<!\[CDATA\[)?([^\]]*)(?:\]\]>)?<\/pubDate>/);
    const thumbnailMatch = itemContent.match(/<enclosure[^>]+url="([^"]+)"/);

    if (titleMatch && linkMatch) {
      // Clean up description if available
      let description = '';
      if (descriptionMatch) {
        description = descriptionMatch[1]
          .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags
          .trim();
      }

      items.push({
        rank: items.length + 1,
        title: titleMatch[1].trim(),
        artist: pubDateMatch ? formatPubDate(pubDateMatch[1]) : 'Tuoitre.vn',
        thumbnailUrl: thumbnailMatch ? thumbnailMatch[1].trim() : null,
        externalUrl: linkMatch[1].trim(),
        source: 'news',
        fetchedAt: new Date().toISOString(),
      });
    }
  }

  if (items.length === 0) {
    throw new Error('No items found in Tuoi Tre RSS feed');
  }

  return items;
}

// Format RSS pubDate to HH:MM time (Vietnam timezone)
function formatPubDate(pubDate: string): string {
  try {
    const date = new Date(pubDate);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh'
    });
  } catch {
    return '';
  }
}

export async function GET(request?: NextRequest) {
  try {
    // Check if refresh is requested
    const skipCache = request?.url ? new URL(request.url).searchParams.get('refresh') === '1' : false;
    
    let rawData: NewsItem[];

    // Try to fetch fresh data from Tuoi Tre RSS
    try {
      rawData = await fetchFromTuoiTreRSS();
    } catch (error) {
      console.warn('[News] RSS fetch failed, checking for cached data:', error);

      // Return cached data if available
      const cachedData = await getCategoryDataSmart(KV_KEYS.NEWS);

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
          warning: 'Using cached data - Tuoi Tre RSS may be temporarily unavailable',
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
      console.warn(`[News] Filtered ${rawData.length - validatedItems.length} invalid items`);
    }

    // Create category data structure
    const categoryData: CategoryData = {
      items: validatedItems,
      lastUpdated: new Date().toISOString(),
      source: 'tuoitre-rss',
      healthy: true,
    };

    // Store in Redis/file cache
    await storeCategoryDataSmart(KV_KEYS.NEWS, categoryData);
    console.log('[News] Data stored successfully');

    return NextResponse.json({
      success: true,
      data: validatedItems,
      source: 'tuoitre-rss',
      cached: false,
      validated: true,
      count: validatedItems.length,
    });

  } catch (error) {
    console.error('[News] Failed to fetch:', error);

    // Try to return cached data from Redis/file
    const cachedData = await getCategoryDataSmart(KV_KEYS.NEWS);

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
        error: 'Failed to fetch News',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: [],
      },
      { status: 500 }
    );
  }
}
