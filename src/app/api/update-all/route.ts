import { NextResponse } from 'next/server';
import { storeTrendsData, storeCategoryDataSmart, getCategoryDataSmart, KV_KEYS } from '@/lib/kv';
import { sanitizeTrendingItems } from '@/lib/validation';
import type { TrendsData, CategoryData, TrendingItem } from '@/lib/schemas';

// Direct fetcher implementations (avoiding HTTP calls blocked by Vercel SSO)

async function fetchSpotifyData(): Promise<{ success: boolean; data?: TrendingItem[]; source?: string; cached?: boolean; error?: string }> {
  try {
    const response = await fetch('https://charts-spotify-com-service.spotify.com/public/v0/charts', {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) throw new Error(`Spotify ${response.status}`);
    const data = await response.json();
    const vnChart = data.chartEntryViewResponses?.find((c: any) => c.entries?.length > 0);
    if (!vnChart?.entries) throw new Error('No VN chart');
    const items = vnChart.entries.slice(0, 10).map((e: any, i: number) => ({
      rank: i + 1, title: e.trackMetadata.trackName,
      artist: e.trackMetadata.artists.map((a: any) => a.name).join(', '),
      thumbnailUrl: e.trackMetadata.displayImageUri || null,
      externalUrl: `https://open.spotify.com/track/${e.trackMetadata.trackUri.replace('spotify:track:', '')}`,
      source: 'spotify', fetchedAt: new Date().toISOString(),
    }));
    const validated = sanitizeTrendingItems(items);
    await storeCategoryDataSmart(KV_KEYS.SPOTIFY, { items: validated, lastUpdated: new Date().toISOString(), source: 'spotify-api', healthy: true });
    return { success: true, data: validated, source: 'spotify-api' };
  } catch (e) {
    const cached = await getCategoryDataSmart(KV_KEYS.SPOTIFY);
    return cached?.items.length ? { success: true, data: cached.items, source: cached.source, cached: true } : { success: false, error: String(e) };
  }
}

async function fetchYouTubeData(): Promise<{ success: boolean; data?: TrendingItem[]; source?: string; cached?: boolean; error?: string }> {
  try {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) throw new Error('No YOUTUBE_API_KEY');
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=VN&maxResults=10&key=${key}`);
    if (!res.ok) throw new Error(`YouTube ${res.status}`);
    const data = await res.json();
    const items = data.items.map((v: any, i: number) => ({
      rank: i + 1, title: v.snippet.title, artist: v.snippet.channelTitle,
      thumbnailUrl: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url || null,
      externalUrl: `https://youtube.com/watch?v=${v.id}`, source: 'youtube', fetchedAt: new Date().toISOString(),
    }));
    const validated = sanitizeTrendingItems(items);
    await storeCategoryDataSmart(KV_KEYS.YOUTUBE, { items: validated, lastUpdated: new Date().toISOString(), source: 'youtube-api', healthy: true });
    return { success: true, data: validated, source: 'youtube-api' };
  } catch (e) {
    const cached = await getCategoryDataSmart(KV_KEYS.YOUTUBE);
    return cached?.items.length ? { success: true, data: cached.items, source: cached.source, cached: true } : { success: false, error: String(e) };
  }
}

async function fetchGoogleData(): Promise<{ success: boolean; data?: TrendingItem[]; source?: string; cached?: boolean; error?: string }> {
  try {
    const res = await fetch('https://trends.google.com/trending/rss?geo=VN', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`RSS ${res.status}`);
    const xml = await res.text();
    const items: TrendingItem[] = [];
    const blocks = xml.split('<item>').slice(1);
    for (const block of blocks.slice(0, 10)) {
      const end = block.indexOf('</item>');
      if (end === -1) continue;
      const c = block.substring(0, end);
      const t = c.match(/<title>([^<]*)<\/title>/);
      const tr = c.match(/<ht:approx_traffic>([^<]*)<\/ht:approx_traffic>/);
      const p = c.match(/<ht:picture>([^<]*)<\/ht:picture>/);
      const u = c.match(/<ht:news_item_url>([^<]*)<\/ht:news_item_url>/);
      if (t && tr) items.push({ rank: items.length + 1, title: t[1].trim(), artist: tr[1].trim(), thumbnailUrl: p?.[1].trim() || null, externalUrl: u?.[1].trim() || `https://www.google.com/search?q=${encodeURIComponent(t[1].trim())}`, source: 'google', fetchedAt: new Date().toISOString() });
    }
    if (!items.length) throw new Error('No RSS items');
    const validated = sanitizeTrendingItems(items);
    await storeCategoryDataSmart(KV_KEYS.GOOGLE, { items: validated, lastUpdated: new Date().toISOString(), source: 'google-trends-rss', healthy: true });
    return { success: true, data: validated, source: 'google-trends-rss' };
  } catch (e) {
    const cached = await getCategoryDataSmart(KV_KEYS.GOOGLE);
    return cached?.items.length ? { success: true, data: cached.items, source: cached.source, cached: true } : { success: false, error: String(e) };
  }
}

async function fetchNetflixData(): Promise<{ success: boolean; data?: TrendingItem[]; source?: string; cached?: boolean; error?: string }> {
  try {
    // Import and call the Netflix fetcher directly
    const { GET: netflixGET } = await import('../fetchers/netflix/route');
    const response = await netflixGET();
    const data = await response.json();
    if (!data.success || !data.data?.length) throw new Error('No Netflix data');
    return { success: true, data: data.data, source: data.source || 'netflix-flixpatrol' };
  } catch (e) {
    const cached = await getCategoryDataSmart(KV_KEYS.NETFLIX);
    return cached?.items.length ? { success: true, data: cached.items, source: cached.source, cached: true } : { success: false, error: String(e) };
  }
}

async function fetchNewsData(): Promise<{ success: boolean; data?: TrendingItem[]; source?: string; cached?: boolean; error?: string }> {
  try {
    // Import and call the News fetcher directly
    const { GET: newsGET } = await import('../fetchers/news/route');
    const response = await newsGET();
    const data = await response.json();
    if (!data.success || !data.data?.length) throw new Error('No News data');
    return { success: true, data: data.data, source: data.source || 'tuoitre-rss' };
  } catch (e) {
    const cached = await getCategoryDataSmart('trending_news');
    return cached?.items.length ? { success: true, data: cached.items, source: cached.source, cached: true } : { success: false, error: String(e) };
  }
}

export async function GET() {
  const start = Date.now();
  const results = await Promise.allSettled([fetchSpotifyData(), fetchYouTubeData(), fetchGoogleData(), fetchNetflixData(), fetchNewsData()]);
  const categories: TrendsData = { lastUpdated: new Date().toISOString() };
  const health: Record<string, { available: boolean; stale: boolean; fresh: boolean; error?: string }> = {};
  const keys = ['spotify', 'youtube', 'google', 'netflix', 'news'] as const;
  
  results.forEach((r, i) => {
    const cat = keys[i];
    if (r.status === 'fulfilled' && r.value.success && r.value.data?.length) {
      (categories as any)[cat] = { items: r.value.data, lastUpdated: new Date().toISOString(), source: r.value.source, healthy: !r.value.cached };
      health[cat] = { available: true, stale: !!r.value.cached, fresh: !r.value.cached };
    } else {
      health[cat] = { available: false, stale: true, fresh: false, error: r.status === 'fulfilled' ? r.value.error : r.reason?.message };
    }
  });
  
  await storeTrendsData(categories);
  return NextResponse.json({ success: true, duration: `${Date.now() - start}ms`, stats: { total: Object.values(health).filter(h => h.available).length, healthy: Object.values(health).filter(h => h.available && !h.stale).length, stale: Object.values(health).filter(h => h.stale).length }, health, lastUpdated: categories.lastUpdated });
}
