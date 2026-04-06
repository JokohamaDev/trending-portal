import { NextResponse } from 'next/server';
import { storeTrendsData, KV_KEYS } from '@/lib/kv';
import type { TrendsData, CategoryData, TrendingItem } from '@/lib/schemas';

interface FetcherResult {
  success: boolean;
  data?: TrendingItem[];
  source?: string;
  cached?: boolean;
  fresh?: boolean;
  error?: string;
}

// Helper to call a fetcher endpoint
async function callFetcher(endpoint: string): Promise<FetcherResult> {
  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 }, // Don't cache this internal request
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        fresh: false,
      };
    }

    const result = await response.json();
    
    return {
      success: result.success,
      data: result.data,
      source: result.source,
      cached: result.cached || false,
      fresh: !result.cached && result.success,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fresh: false,
    };
  }
}

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Call all fetchers in parallel with Promise.allSettled
    const results = await Promise.allSettled([
      callFetcher('/api/fetchers/spotify'),
      callFetcher('/api/fetchers/youtube'),
      callFetcher('/api/fetchers/netflix'),
      callFetcher('/api/fetchers/google'),
    ]);

    const categories: TrendsData = {
      lastUpdated: new Date().toISOString(),
    };

    const sourceHealth: Record<string, { 
      available: boolean; 
      stale: boolean;
      fresh: boolean;
      error?: string;
    }> = {};

    const categoryKeys = ['spotify', 'youtube', 'netflix', 'google'] as const;
    
    // Process results
    results.forEach((result, index) => {
      const category = categoryKeys[index];
      
      if (result.status === 'fulfilled') {
        const fetcherResult = result.value;
        
        if (fetcherResult.success && fetcherResult.data && fetcherResult.data.length > 0) {
          // Create category data
          const categoryData: CategoryData = {
            items: fetcherResult.data,
            lastUpdated: new Date().toISOString(),
            source: fetcherResult.source || `${category}-api`,
            healthy: !fetcherResult.cached,
          };
          
          (categories as unknown as Record<string, CategoryData | undefined>)[category] = categoryData;
          
          sourceHealth[category] = {
            available: true,
            stale: !!fetcherResult.cached,
            fresh: fetcherResult.fresh || false,
          };
        } else {
          // Fetcher returned success=false or no data
          sourceHealth[category] = {
            available: false,
            stale: true,
            fresh: false,
            error: fetcherResult.error || 'No data returned',
          };
        }
      } else {
        // Promise was rejected
        sourceHealth[category] = {
          available: false,
          stale: true,
          fresh: false,
          error: result.reason?.message || 'Request failed',
        };
      }
    });

    // Calculate stats
    const totalCategories = Object.values(sourceHealth).filter(s => s.available).length;
    const healthyCategories = Object.values(sourceHealth).filter(s => s.available && !s.stale).length;
    const staleCategories = Object.values(sourceHealth).filter(s => s.stale).length;
    const failedCategories = 4 - totalCategories;

    // Store aggregated data
    await storeTrendsData(categories);
    console.log('[Aggregator] All trends data stored successfully');

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'All categories updated successfully',
      duration: `${duration}ms`,
      stats: {
        totalCategories,
        healthyCategories,
        staleCategories,
        failedCategories,
      },
      sourceHealth,
      lastUpdated: categories.lastUpdated,
    });

  } catch (error) {
    console.error('[Aggregator] Failed to update all:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update all categories',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
