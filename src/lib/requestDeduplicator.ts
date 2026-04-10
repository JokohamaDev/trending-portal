// Request deduplication to prevent duplicate concurrent fetches
// Uses in-memory Map to track pending requests and their promises

import { config } from '@/lib/config';

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private hitCount = 0;
  private missCount = 0;

  // Generate a cache key from request parameters
  private generateKey(category: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${category}:${sortedParams}`;
  }

  // Execute a request with deduplication
  async execute<T>(
    category: string,
    params: Record<string, any>,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const key = this.generateKey(category, params);
    const now = Date.now();

    // Check for existing pending request
    const existing = this.pendingRequests.get(key);
    
    if (existing) {
      // Check if the request is still valid (within TTL)
      if (now - existing.timestamp < config.cache.requestDedupTtlMs) {
        this.hitCount++;
        console.log(`[Dedup] Cache hit for ${key}`);
        return existing.promise;
      } else {
        // Remove expired entry
        this.pendingRequests.delete(key);
      }
    }

    this.missCount++;
    console.log(`[Dedup] Cache miss for ${key}, creating new request`);

    // Create new request
    const promise = requestFn()
      .finally(() => {
        // Remove from pending requests after completion
        setTimeout(() => {
          this.pendingRequests.delete(key);
        }, config.cache.requestDedupTtlMs);
      });

    // Store pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: now,
    });

    return promise;
  }

  // Get deduplication statistics
  getStats() {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? (this.hitCount / total) * 100 : 0;
    
    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      total,
      hitRate: hitRate.toFixed(2) + '%',
      pendingCount: this.pendingRequests.size,
    };
  }

  // Clear all pending requests (useful for testing or cleanup)
  clear() {
    this.pendingRequests.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator();

// Helper function to deduplicate fetcher calls
export async function deduplicatedFetch<T>(
  category: string,
  params: Record<string, any>,
  fetcher: () => Promise<T>
): Promise<T> {
  return requestDeduplicator.execute(category, params, fetcher);
}
