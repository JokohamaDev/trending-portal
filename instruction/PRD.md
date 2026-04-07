# **Product Requirement Document: Vietnam Trending Media Dashboard**

## 1. Introduction & Vision

This document outlines the product requirements for the "Vietnam Trending Media Dashboard," a single-page web application designed to display the top trending items across a wide variety of categories reflecting Vietnamese internet culture.

The vision is to create a simple, visually appealing, and auto-updating dashboard that serves as a comprehensive cultural snapshot of "what's trending in Vietnam." The project will display data from search engines, streaming services, major social networks, news outlets, and e-commerce platforms. It will be built using a modern, AI-friendly tech stack that is easy to maintain and can be hosted for free.

## 2. Target Audience

*   **Primary Users:** Individuals in Vietnam or those interested in Vietnamese culture who want a quick and easy way to see what's popular across many facets of daily life.
*   **Use Case:** A personal homepage or a dashboard displayed on a home TV, providing a daily glance at trending media, news, and products.

## 3. Features & Requirements

### 3.1. Core Feature: Single-Page Dashboard

The application will be a single, responsive webpage that displays all trending categories clearly and concisely. The layout will be a grid or column-based design, ensuring it is easily readable from a distance (suitable for a TV).

### 3.2. Data Categories

The dashboard will feature the following sections. The core categories are based on official APIs, while the extended categories may rely on less stable methods like web scraping.

#### Core Categories:
*   **Top 10 Google Searches:** Displays the top 10 daily search queries trending on Google in Vietnam.
*   **Top 10 on Netflix:** Displays the top 10 trending movies and TV shows on Netflix Vietnam.
*   **Top 10 on Spotify:** Displays the top 10 most-streamed songs from Spotify's daily chart for Vietnam (via alternative free/budget data sources like web scraping or third-party aggregators, as official Charts API was deprecated in 2022).
*   **Top 10 on YouTube:** Displays the top 10 trending videos/music videos on YouTube for Vietnam.
*   **Top 10 Trends on X (Twitter):** Displays the top 10 trending topics/hashtags on X for the Vietnam region (**Note: Requires paid X API Basic tier $100/month**).
*   **Top 10 News Articles:** Displays the most-read articles from the RSS feeds of major Vietnamese news outlets.
*   **Top 10 on Steam:** Displays the top-selling PC games in the Vietnam region on the Steam store.

#### Extended / Experimental Categories:
*   **Top 10 Trends on TikTok:** Displays trending hashtags or videos on TikTok.
*   **Top 10 Products on Shopee:** Displays top-selling or trending products from Shopee Vietnam.

### 3.3. Item Card Component

Each item within a list will be displayed as a card with the following elements:

*   **Required:**
    *   **Ranking:** A number from 1 to 10.
    *   **Thumbnail:** A relevant image (poster, album art, product image, etc.).
    *   **Title/Name:** The name of the movie, song, product, or search query.
*   **Optional (if available from the data source):**
    *   **Artist / Channel / Publisher:** For music, videos, and news.
    *   **Views / Streams / Price:** A relevant metric of popularity or cost.

### 3.4. User Interaction & Error Handling

*   Clicking on an item card will open a new tab.
*   The link will direct to the official page for the item (e.g., the song on Spotify, the product on Shopee).
*   If a direct link is not available, it will redirect to a search results page for that query.
*   **API Failure Handling:** If a data source fails, the section should display a graceful "Data unavailable" message instead of crashing the entire dashboard.
*   **Empty State:** Categories with no data should show a friendly placeholder message.

## 4. Technical Specifications

### 4.1. Proposed Tech Stack

*   **Frontend:** Next.js (React)
*   **Backend/Data Fetching:** Vercel Serverless Functions (Cron Job)
*   **Database:** Vercel KV (Key-Value storage)
*   **Hosting & Deployment:** Vercel

### 4.2. Data Sources & Integration (⚠️ API Costs & Limitations)

The data will be sourced from the following free-tier APIs and services. **Important: Some sources have paid tiers or strict quota limits.**

| Source | API/Service | Cost/Limitations | Fallback Strategy |
|--------|-------------|------------------|-------------------|
| **Google Trends** | SerpApi Google Trends API | 100 free searches/month, then $50+/month | Cache data for 24h, skip if quota exceeded |
| **Netflix Top 10** | Apify Netflix scraper | Free tier: $5 credit/month (~500 runs) | Mark as experimental, may fail |
| **Spotify Charts** | Web scraping (charts.spotify.com) or Kworb aggregators | **FREE** - unofficial method | Use cached data up to 7 days old |
| **YouTube Trending** | YouTube Data API v3 | 10,000 quota units/day | Cache for 24h, use "mostPopular" region filter |
| **X (Twitter) Trends** | X API v2 | **PAID ONLY** - Basic tier $100+/month | Mark as optional/paid feature, can disable |
| **News Articles** | RSS Feeds (VNExpress, Tuổi Trẻ) | **FREE** - no limits expected | Multiple fallback RSS sources |
| **Steam Charts** | Official Steam API | **FREE** - no strict limits | N/A |
| **TikTok Trends** | Third-party scraping (Apify) | Free tier limits | Mark as experimental |
| **Shopee Trends** | Third-party scraping (Apify) | Free tier limits, may violate ToS | Mark as experimental, legal disclaimer |

**⚠️ Important Notes:**
- **Spotify**: Official Charts API was deprecated in 2022. Using free alternative sources like web scraping of public chart pages or third-party aggregators (e.g., Kworb).
- **X/Twitter**: The free tier does NOT include trends access. This feature requires paid API access ($100/month Basic tier). Consider making this optional.
- **Vercel KV Limits**: 3,000 commands/day on free tier (sufficient for 9 categories updating once daily).

### 4.3. Data Flow, Validation & Architecture

1.  **Daily Trigger:** A scheduled Vercel Cron Job runs once every 24 hours.
2.  **Data Fetching:** The serverless function executes parallel API calls to all data sources. It must include robust error handling to ensure that the failure of one source (especially a scraping-based one) does not prevent the others from succeeding.
3.  **Data Validation:** Each fetcher must validate API responses against a JSON schema before processing. Invalid responses are logged and discarded.
4.  **Data Aggregation:** The function processes and standardizes the data from all successful sources into a single JSON object. It will note if a source failed to update.
5.  **Data Storage:** The function saves this JSON object to the Vercel KV database with a `lastUpdatedAt` timestamp.
6.  **Frontend Display:** The Next.js application fetches the JSON data from Vercel KV and renders the dashboard, potentially hiding sections for which data could not be fetched on a given day.
7.  **Caching Strategy:** Each fetcher should implement a fallback to return stale data (up to 7 days) if fresh data cannot be fetched.

## 5. Design & UX

*   **Layout:** A clean, grid-based, single-page dashboard.
*   **Theme:** A modern, dark or light theme that is easy on the eyes.
*   **Responsiveness:** The design must be fully responsive and look good on desktops, tablets, and mobile devices.

## 6. Future Roadmap (Post-MVP)

*   **Monetization:** Integrate unobtrusive display advertising.
*   **Customization:** Allow users to reorder or hide categories.
*   **Historical Data:** Implement a feature to view trends from previous days.
*   **Additional Vietnamese Sources:** Consider adding Zing MP3 (Vietnamese music platform) as alternative to Spotify.