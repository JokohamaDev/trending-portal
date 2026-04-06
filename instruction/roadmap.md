# Development Roadmap: Vietnam Trending Media Dashboard

> **Agent Instructions**: Mark tasks as `[x]` when completed. Each phase builds on previous work. Complete all tasks in a phase before moving to the next.

---

## Phase 1: Project Setup & First Core Source (Spotify)

**Goal**: Initialize project and establish end-to-end data pipeline with one core source
**Time**: 1 Day

- [x] **1.1 Initialize Next.js Project & Deploy**
  - Create Next.js app with `create-next-app`
  - Push to GitHub, connect to Vercel
  - Verify auto-deployment on `main` branch pushes
  - **Acceptance**: Live Vercel URL exists - **https://trending-portal-mn7dsqs1h-jokohamadevs-projects.vercel.app**

- [ ] **1.2 Create Spotify Fetcher**
  - Create `/api/fetchers/spotify` endpoint
  - Scrape from charts.spotify.com, Kworb, or Apify (official API deprecated 2022)
  - Implement error handling + 7-day stale cache fallback
  - Return: `{ rank, title, artist, thumbnailUrl, externalUrl, source, fetchedAt }`
  - **Acceptance**: Returns exactly 10 songs, handles failures gracefully

- [ ] **1.3 Setup Vercel KV & Schema Validation**
  - Enable Vercel KV, install `@vercel/kv`
  - Define Zod schema for standardized item structure
  - Create `validateData()` utility
  - Create `/api/trends` to read from `trending_spotify` key
  - **Acceptance**: Valid data stores in KV, invalid data rejected with logs

- [ ] **1.4 Create Environment Documentation**
  - Create `.env.example` with `KV_URL`, `KV_REST_API_TOKEN`, `YOUTUBE_API_KEY`, etc.
  - Add README setup instructions
  - **Acceptance**: `.env.example` exists with all documented variables

---

## Phase 2: Frontend Foundation

**Goal**: Build UI components and display Spotify data
**Time**: 1 Day

- [ ] **2.1 Build Reusable UI Components**
  - Create `ItemCard` (rank, title, subtitle, thumbnailUrl)
  - Create `CategoryList` (title + grid of ItemCards)
  - Implement responsive layout (mobile + desktop)
  - **Acceptance**: Components render correctly with mock data

- [ ] **2.2 Develop Main Dashboard Page**
  - Fetch from `/api/trends` on page load
  - Implement loading state
  - Click on ItemCard opens `externalUrl` in new tab
  - **Acceptance**: Displays Spotify Top 10, interactive cards work

- [ ] **2.3 Create Mock Data & Dev Fallback**
  - Create `mockData.json` with sample data for all 9 categories
  - Add `USE_MOCK_DATA=true` env flag
  - Modify fetch to use mock when flag is set
  - **Acceptance**: Dashboard works without API keys in dev mode

---

## Phase 3: Integrate Remaining Core Categories

**Goal**: Add YouTube, Netflix, Google (all core per PRD) with master aggregator
**Time**: 2 Days

- [ ] **3.1 Integrate YouTube Trending API**
  - Create `/api/fetchers/youtube`
  - Call YouTube Data API v3 `videos().list` with `chart='mostPopular'`, `regionCode='VN'`
  - Store `YOUTUBE_API_KEY` in env vars
  - Implement quota management: track usage, return cached data when exceeded
  - **Acceptance**: Returns 10 videos, handles quota exceeded gracefully with `cached: true` flag

- [ ] **3.2 Integrate Netflix Top 10 (via Apify)**
  - Create `/api/fetchers/netflix`
  - Call Apify actor for Netflix Top 10 Vietnam
  - Store `APIFY_API_TOKEN` in env vars
  - **Note**: Mark as `experimental: true` in response (may violate ToS)
  - **Acceptance**: Returns 10 movies/shows, graceful error handling

- [ ] **3.3 Integrate Google Trends via SerpApi**
  - Create `/api/fetchers/google`
  - Call SerpApi Google Trends endpoint for Vietnam
  - Store `SERPAPI_API_KEY` in env vars
  - **Acceptance**: Returns 10 search trends, handles API errors

- [ ] **3.4 Create Master Aggregator & Cron Job**
  - Create `/api/update-all` calling all fetchers with `Promise.allSettled()`
  - Each fetcher: try fresh → validate → fallback to cached → mark `fresh: false` if cached
  - Aggregate to single JSON with `lastUpdatedAt`, `sourceHealth` per category
  - Save to KV key `trending_all`
  - Configure `vercel.json` cron job (max 1 job on free tier)
  - **Acceptance**: Populates KV with all sources, failed sources retain yesterday's data

- [ ] **3.5 Update Frontend for All Core Categories**
  - Update `/api/trends` to read from `trending_all` key
  - Render 4 `CategoryList` components: Spotify, YouTube, Netflix, Google
  - **Acceptance**: Dashboard displays all 4 core categories

---

## Phase 4: Launch Readiness

**Goal**: Polish UI, add analytics, testing, production deployment
**Time**: 1-2 Days

- [ ] **4.1 UI/UX Polish**
  - Add header, footer
  - Display "Last Updated" timestamp from KV
  - Add error state UI for failed data loads
  - Add SEO tags (`<title>`, `<meta name="description">`)
  - **Acceptance**: Timestamp visible, error states handled, SEO set

- [ ] **4.2 Integrate Google Analytics 4**
  - Create GA4 property, get Measurement ID
  - Store `NEXT_PUBLIC_GA_ID` in Vercel env
  - Add GA script to layout using Next.js Script component
  - **Acceptance**: Page views sent to GA, real-time dashboard shows activity

- [ ] **4.3 Final Review & Production Deploy**
  - Review all env vars in production
  - Test full user flow on production URL
  - Verify cron job running in Vercel dashboard logs
  - **Acceptance**: Live on primary domain, cron job confirmed running

- [ ] **4.4 Add Unit & Integration Tests**
  - Setup Jest/Vitest
  - Write tests for data validation functions
  - Write integration tests for each fetcher (mocked APIs)
  - Write UI component tests with mock data
  - Add GitHub Actions workflow for PR tests
  - **Acceptance**: `npm test` passes, CI runs on PRs

---

## Phase 5: Optional Expansion (Reliable APIs)

**Goal**: Add X (paid), News (RSS), Steam — only if budget/resources allow
**Time**: 2-3 Days
**Note**: These are **optional** per PRD. Skip if time/budget constrained.

- [ ] **5.1 Integrate X (Twitter) Trends API [PAID - $100/month]**
  - Create `/api/fetchers/x`
  - Requires X API Basic tier ($100/month) — free tier has no trends access
  - Store `X_API_BEARER_TOKEN`, add `ENABLE_X_API` feature flag
  - Skip gracefully when `ENABLE_X_API=false`
  - **Acceptance**: Returns trends when enabled, skips cleanly when disabled

- [ ] **5.2 Integrate News via RSS Feeds**
  - Create `/api/fetchers/news`
  - Use VNExpress or Tuổi Trẻ RSS feeds (free, no limits)
  - Parse XML to JSON, return top 10 articles
  - **Acceptance**: Returns 10 news articles with title, link, description

- [ ] **5.3 Integrate Steam Top Sellers**
  - Create `/api/fetchers/steam`
  - Use official Steam API (free, no strict limits)
  - Return top 10 selling games for Vietnam
  - **Acceptance**: Returns 10 games with title, thumbnail, link

- [ ] **5.4 Update Aggregator & Frontend for Phase 5**
  - Add X, News, Steam to `/api/update-all`
  - Update `trending_all` structure with new categories
  - Render 3 new `CategoryList` components
  - **Acceptance**: Dashboard shows up to 7 categories total

---

## Phase 6: Experimental Expansion (Scraping)

**Goal**: Add TikTok, Shopee via scraping — expect occasional failures
**Time**: 2-3 Days
**Note**: These are **experimental** per PRD. May violate ToS, handle gracefully.

- [ ] **6.1 Integrate TikTok Trends (via Apify)**
  - Create `/api/fetchers/tiktok`
  - Configure Apify TikTok scraper
  - Return top 10 trends/hashtags
  - **Acceptance**: Returns 10 TikTok trends, failures don't break aggregator

- [ ] **6.2 Integrate Shopee Products (via Apify)**
  - Create `/api/fetchers/shopee`
  - Configure Apify actor for shopee.vn trending products
  - Return top 10 products with name, image, price, link
  - **Acceptance**: Returns 10 products, robust error handling

- [ ] **6.3 Final Frontend Update for Experimental**
  - Add TikTok, Shopee to aggregator
  - Update dashboard to show up to 9 categories
  - Add "Trends unavailable today" message for empty states
  - **Acceptance**: 9 categories display, graceful handling of missing data

---

## Summary

| Phase | Categories | Key Deliverables |
|-------|-----------|------------------|
| 1 | Spotify | Project setup, KV storage, first fetcher |
| 2 | Spotify | UI components, dashboard, mock data |
| 3 | +YouTube, Netflix, Google | Master aggregator, cron job, 4 core categories |
| 4 | 4 core | Analytics, tests, production launch |
| 5 | +X, News, Steam (optional) | 7 categories (X requires $100/mo) |
| 6 | +TikTok, Shopee (experimental) | 9 total categories, scraping sources |

**Priority Order**: Complete Phases 1-4 for MVP. Phases 5-6 are optional enhancements.