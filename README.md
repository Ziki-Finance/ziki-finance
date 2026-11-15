# Ziki Finance

A finance research workspace designed around Ziki’s deep navy navigation (`#0b1733`, `#0c1938`), electric blue actions (`#3978f6`, `#2e6fef`), pale canvas (`#f5f7fc`), compact research tables, and attributable agent activity. Brand references: [ziki.dev](https://ziki.dev) and its [public theme tokens](https://github.com/emerjent/ziki/blob/main/app/globals.css).

## Run

Requires Node.js 22 or newer. There are no third-party runtime dependencies or build steps.

```sh
npm start
```

Open http://localhost:3000. `/finance` serves the same application. For development, use `npm run dev`.

## Included

- Responsive overview, stock research, watchlist, daily briefing, and agent pages.
- Six supported US stocks: NVDA, AAPL, MSFT, TSLA, AMZN, JPM.
- Company/ticker search, verdict filters, daily-change sorting, research dialogs, and downloadable text reports.
- Browser-local saved watchlists; no sign-in required.
- Server-side Finnhub quotes, trailing financial metrics, and recent company news with links and timestamps.
- Four deterministic research specialists: Atlas (fundamentals), Pulse (daily price movement), Scout (news collection), Shield (risk review).
- Buy / Hold / Reduce / Unrated assessments with a published methodology and explicit evidence gaps.
- Daily snapshots persisted to disk, a briefing archive, and a protected external refresh endpoint.

## Live market evidence

Copy `.env.example` to `.env`, set `FINNHUB_API_KEY`, then restart. Without a key, **all prices, metrics, headlines, and verdicts are fictional sample scenarios**. With a key, provider errors remain errors; they never fall back to fictional data.

Keys stay on the server, in an ignored `.env` file. No key entry is exposed in the browser. Your Finnhub plan must permit quote, basic financials, and company news requests. Quotes may be delayed and financials can have different reporting periods. Evidence is cached in process for 15 minutes. Up to 18 provider calls populate the six-stock universe. News/fundamental failures are reported separately; a failed quote prevents that company’s report.

Provider documentation: [quotes](https://finnhub.io/docs/api/quote), [basic financials](https://finnhub.io/docs/api/company-basic-financials), [company news](https://finnhub.io/docs/api/company-news).

## How the research works

These are **rules-based specialist agents**, not LLM agents or independently trained predictive models. Scout retrieves source coverage; it does not invent sentiment. There is no claimed confidence percentage, return forecast, or unsupported price target.

- **Buy:** revenue growth ≥10%, net margin ≥10%, positive trailing P/E <55, and daily movement >−2%.
- **Reduce:** negative revenue growth or margin together with P/E >50.
- **Hold:** complete evidence that does not meet those conditions.
- **Unrated:** missing required financials or daily movement, invalid price, or a quote more than 96 hours old.

Risk and news assessments provide context and do not cast directional votes. The 96-hour quote window allows weekends but is deliberately simple; this release does not use an exchange holiday calendar. Daily price movement is not a technical trend. Research is general and not portfolio-specific. The app never connects to a broker or executes trades.

## Daily briefings

The server checks once per minute and generates a briefing after **22:00 UTC, Monday–Friday**, while running. Snapshots are deduplicated by UTC date and data mode. The latest 60 editions are retained in `data/briefings.json`, written atomically. Failed companies are listed in partial briefings; complete failures preserve prior snapshots. The scheduler does not backfill missed days or detect market holidays.

Generate an edition manually:

```sh
npm run briefing
```

For a managed scheduler, set `DAILY_BRIEFING_ENABLED=false`, configure `CRON_SECRET`, and schedule `POST /api/briefings/refresh` with `Authorization: Bearer <your-secret>`. A missing or incorrect secret is rejected. Do not put the secret in a URL. Only one server process should write to the data directory. Use a durable mounted volume in production; ephemeral hosting loses the archive on restart.

## Verify

```sh
npm run check
npm test
```

Tests cover directional rules, missing/stale evidence, evidence attribution, live provider failures, sample isolation, HTTP routing and security headers, cron authorization, and briefing persistence/deduplication. Provider tests use controlled responses; a real key is required to validate a live subscription end to end.

## Integration and deployment

This is a standalone feature app in the new finance repository, not a modification of Ziki’s existing Next.js application. UI assets are under `public/`; provider, research, and briefing modules are under `server/`. The HTTP API can be adapted to Ziki route handlers and its existing authentication.

Run on any Node.js 22 host with a persistent disk. Set `HOST=0.0.0.0` if your host requires it; terminate HTTPS at a reverse proxy. A Dockerfile is provided. The app has no user accounts: watchlists are local to each browser, and the shared briefing archive is visible to visitors. Apply Ziki organisation authentication and access controls before integrating private user or portfolio data.

Endpoints: `GET /api/config`, `GET /api/market`, `GET /api/research?symbol=NVDA`, `GET /api/briefings`, and authenticated `POST /api/briefings/refresh`. API responses are not cached by browsers, input symbols are allowlisted, provider calls time out, the server rate-limits requests, and a restrictive content security policy is applied.

No hosted deployment or real-data credentials are included. The UI opens in sample mode until configured. LLM reasoning, brokerage execution, push/email delivery, arbitrary ticker discovery, account sync, and portfolio suitability are outside this first release.
