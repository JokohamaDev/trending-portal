import { NextResponse } from 'next/server';
import { getCategoryDataSmart, KV_KEYS } from '@/lib/kv';
import { requestDeduplicator } from '@/lib/requestDeduplicator';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check all data source health
    const categories = ['spotify', 'youtube', 'netflix', 'google', 'news', 'steam'] as const;
    const healthChecks = await Promise.allSettled(
      categories.map(async (cat) => {
        const key = KV_KEYS[cat.toUpperCase() as keyof typeof KV_KEYS];
        const data = await getCategoryDataSmart(key);
        
        if (!data || data.items.length === 0) {
          return { category: cat, available: false, stale: true, itemCount: 0 };
        }
        
        const cacheAge = Date.now() - new Date(data.lastUpdated).getTime();
        const staleThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
        const isStale = cacheAge > staleThreshold;
        
        return {
          category: cat,
          available: true,
          stale: isStale,
          itemCount: data.items.length,
          lastUpdated: data.lastUpdated,
          source: data.source,
          cacheAgeMs: cacheAge,
        };
      })
    );
    
    // Process results
    const sourceHealth: Record<string, any> = {};
    let totalAvailable = 0;
    let totalStale = 0;
    
    healthChecks.forEach((result, index) => {
      const cat = categories[index];
      if (result.status === 'fulfilled') {
        sourceHealth[cat] = result.value;
        if (result.value.available) totalAvailable++;
        if (result.value.stale) totalStale++;
      } else {
        sourceHealth[cat] = {
          category: cat,
          available: false,
          stale: true,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });
    
    // Get deduplication stats
    const dedupStats = requestDeduplicator.getStats();
    
    // Calculate overall health
    const overallHealth = totalAvailable === categories.length ? 'healthy' : 
                          totalAvailable > 0 ? 'degraded' : 'unhealthy';
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: overallHealth,
      timestamp: new Date().toISOString(),
      responseTimeMs: responseTime,
      sources: sourceHealth,
      summary: {
        totalCategories: categories.length,
        available: totalAvailable,
        stale: totalStale,
        healthy: totalAvailable - totalStale,
      },
      deduplication: dedupStats,
      environment: process.env.NODE_ENV || 'development',
    });
    
  } catch (error) {
    console.error('[Health] Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
