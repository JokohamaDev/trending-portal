// Source health monitoring to track data source reliability
import { logger } from '@/lib/logger';

interface SourceMetrics {
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  lastSuccessTime: number | null;
  lastFailureTime: number | null;
  lastFailureMessage: string | null;
  averageResponseTime: number;
  totalResponseTime: number;
  cacheHits: number;
  cacheMisses: number;
}

class SourceHealthMonitor {
  private metrics: Map<string, SourceMetrics> = new Map();
  private alertThreshold: number;

  constructor(alertThreshold = 3) {
    this.alertThreshold = alertThreshold;
  }

  private getOrCreateMetrics(source: string): SourceMetrics {
    if (!this.metrics.has(source)) {
      this.metrics.set(source, {
        successCount: 0,
        failureCount: 0,
        consecutiveFailures: 0,
        lastSuccessTime: null,
        lastFailureTime: null,
        lastFailureMessage: null,
        averageResponseTime: 0,
        totalResponseTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
      });
    }
    return this.metrics.get(source)!;
  }

  recordSuccess(source: string, responseTime: number, fromCache: boolean = false) {
    const metrics = this.getOrCreateMetrics(source);
    
    metrics.successCount++;
    metrics.consecutiveFailures = 0;
    metrics.lastSuccessTime = Date.now();
    metrics.totalResponseTime += responseTime;
    metrics.averageResponseTime = metrics.totalResponseTime / metrics.successCount;
    
    if (fromCache) {
      metrics.cacheHits++;
    } else {
      metrics.cacheMisses++;
    }
    
    logger.debug(`Source ${source} success`, {
      responseTime,
      fromCache,
      successCount: metrics.successCount,
      cacheHitRate: this.getCacheHitRate(source),
    });
  }

  recordFailure(source: string, error: string) {
    const metrics = this.getOrCreateMetrics(source);
    
    metrics.failureCount++;
    metrics.consecutiveFailures++;
    metrics.lastFailureTime = Date.now();
    metrics.lastFailureMessage = error;
    
    logger.warn(`Source ${source} failure`, {
      error,
      consecutiveFailures: metrics.consecutiveFailures,
      totalFailures: metrics.failureCount,
    });

    // Alert if consecutive failures exceed threshold
    if (metrics.consecutiveFailures >= this.alertThreshold) {
      logger.error(`Source ${source} health alert: ${metrics.consecutiveFailures} consecutive failures`, {
        lastFailureMessage: metrics.lastFailureMessage,
        totalFailures: metrics.failureCount,
      });
    }
  }

  getMetrics(source: string): SourceMetrics | null {
    return this.metrics.get(source) || null;
  }

  getAllMetrics(): Record<string, SourceMetrics> {
    return Object.fromEntries(this.metrics.entries());
  }

  isHealthy(source: string): boolean {
    const metrics = this.metrics.get(source);
    if (!metrics) return true;
    return metrics.consecutiveFailures < this.alertThreshold;
  }

  getSuccessRate(source: string): number {
    const metrics = this.metrics.get(source);
    if (!metrics || metrics.successCount + metrics.failureCount === 0) return 1;
    return metrics.successCount / (metrics.successCount + metrics.failureCount);
  }

  getCacheHitRate(source: string): number {
    const metrics = this.metrics.get(source);
    if (!metrics || metrics.cacheHits + metrics.cacheMisses === 0) return 0;
    return metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses);
  }

  getAverageResponseTime(source: string): number {
    const metrics = this.metrics.get(source);
    return metrics?.averageResponseTime || 0;
  }

  reset(source: string) {
    this.metrics.delete(source);
    logger.info(`Reset metrics for source ${source}`);
  }

  resetAll() {
    this.metrics.clear();
    logger.info('Reset all source metrics');
  }

  getUnhealthySources(): string[] {
    const unhealthy: string[] = [];
    for (const [source, metrics] of this.metrics.entries()) {
      if (metrics.consecutiveFailures >= this.alertThreshold) {
        unhealthy.push(source);
      }
    }
    return unhealthy;
  }
}

// Singleton instance
export const sourceHealthMonitor = new SourceHealthMonitor();

// Helper function to wrap fetcher calls with health monitoring
export async function withHealthMonitoring<T>(
  source: string,
  fetcher: () => Promise<T>,
  fromCache: boolean = false
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await fetcher();
    const responseTime = Date.now() - startTime;
    sourceHealthMonitor.recordSuccess(source, responseTime, fromCache);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sourceHealthMonitor.recordFailure(source, errorMessage);
    throw error;
  }
}
