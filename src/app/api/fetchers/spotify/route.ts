import { NextResponse } from 'next/server';
import { writeFile, readFile, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), '.cache', 'spotify-charts.json');
const CACHE_TTL_DAYS = 7;
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

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

interface CacheEntry {
  data: SpotifyChartEntry[];
  timestamp: string;
  source: string;
}

async function readCache(): Promise<CacheEntry | null> {
  try {
    await access(CACHE_FILE, constants.F_OK);
    const content = await readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(content) as CacheEntry;
  } catch {
    return null;
  }
}

async function writeCache(data: SpotifyChartEntry[], source: string): Promise<void> {
  try {
    const cacheDir = path.dirname(CACHE_FILE);
    await access(cacheDir, constants.F_OK).catch(async () => {
      await import('fs/promises').then(fs => fs.mkdir(cacheDir, { recursive: true }));
    });
    
    const entry: CacheEntry = {
      data,
      timestamp: new Date().toISOString(),
      source,
    };
    await writeFile(CACHE_FILE, JSON.stringify(entry, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write cache:', error);
  }
}

function isCacheStale(timestamp: string): boolean {
  const cacheTime = new Date(timestamp).getTime();
  const now = Date.now();
  return now - cacheTime > CACHE_TTL_MS;
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
  // Try to fetch fresh data first
  try {
    let data: SpotifyChartEntry[];
    let source: string;
    
    try {
      data = await fetchFromSpotifyAPI();
      source = 'spotify-api';
    } catch (spotifyError) {
      console.warn('Spotify API failed, trying Kworb fallback:', spotifyError);
      data = await fetchFromKworb();
      source = 'kworb';
    }
    
    // Save to cache
    await writeCache(data, source);
    
    return NextResponse.json({
      success: true,
      data,
      source,
      cached: false,
    });
    
  } catch (error) {
    console.error('Both Spotify sources failed:', error);
    
    // Try to return cached data as fallback
    const cache = await readCache();
    if (cache) {
      return NextResponse.json({
        success: true,
        data: cache.data,
        source: cache.source,
        cached: true,
        stale: isCacheStale(cache.timestamp),
        cachedAt: cache.timestamp,
      });
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch Spotify charts from all sources',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: [],
      },
      { status: 500 }
    );
  }
}
