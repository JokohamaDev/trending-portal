declare module 'google-trends-api' {
  export interface DailyTrendsOptions {
    geo?: string;
    hl?: string;
  }

  export function dailyTrends(options?: DailyTrendsOptions): Promise<string>;
  export function interestOverTime(options?: any): Promise<string>;
  export function interestByRegion(options?: any): Promise<string>;
  export function relatedQueries(options?: any): Promise<string>;
  export function relatedTopics(options?: any): Promise<string>;
  export function realTimeTrends(options?: any): Promise<string>;
}
