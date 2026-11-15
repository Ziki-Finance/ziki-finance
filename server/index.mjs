import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { companies } from './fixtures.mjs';
import { getEvidence } from './provider.mjs';
import { analyzeEvidence, agentDefinitions } from './research.mjs';
import { generateBriefing, readBriefings, startDailyScheduler } from './briefings.mjs';
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const rates = new Map();
function json(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); }
function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const supplied = Buffer.from(req.headers.authorization || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
export const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      const ip = req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      if (rates.size > 10000) for (const [key, value] of rates) if (value.reset < now) rates.delete(key);
      let rate = rates.get(ip);
      if (!rate || rate.reset < now) { rate = { count: 0, reset: now + 60000 }; rates.set(ip, rate); }
      if (++rate.count > 100) return json(res, 429, { error: 'Too many requests. Please try again in a minute.' });
      if (req.method === 'GET' && url.pathname === '/api/config') return json(res, 200, { mode: process.env.FINNHUB_API_KEY ? 'live' : 'demo', companies: companies.map(({ symbol, name, sector, color, mark }) => ({ symbol, name, sector, color, mark })), agents: agentDefinitions });
      if (req.method === 'GET' && url.pathname === '/api/research') {
        const symbol = (url.searchParams.get('symbol') || '').toUpperCase();
        if (!companies.some(c => c.symbol === symbol)) return json(res, 400, { error: 'Choose a supported stock from the research universe.' });
        return json(res, 200, analyzeEvidence(await getEvidence(symbol)));
      }
      if (req.method === 'GET' && url.pathname === '/api/market') {
        const results = await Promise.allSettled(companies.map(async c => analyzeEvidence(await getEvidence(c.symbol))));
        const reports = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        if (!reports.length) return json(res, 502, { error: 'Market data is unavailable. Check the provider configuration and try again.' });
        return json(res, 200, { reports, errors: results.flatMap((r, i) => r.status === 'rejected' ? [companies[i].symbol] : []) });
      }
      if (req.method === 'GET' && url.pathname === '/api/briefings') return json(res, 200, { briefings: await readBriefings() });
      if (req.method === 'POST' && url.pathname === '/api/briefings/refresh') {
        if (!authorized(req)) return json(res, 401, { error: 'A valid server cron credential is required.' });
        return json(res, 200, await generateBriefing());
      }
      return json(res, 404, { error: 'Endpoint not found' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    const assets = { '/': ['index.html', 'text/html; charset=utf-8'], '/finance': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'] };
    const asset = assets[url.pathname];
    if (!asset) { res.writeHead(404); return res.end('Not found'); }
    const content = await readFile(publicDir + asset[0]);
    res.writeHead(200, { 'Content-Type': asset[1], 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    console.error(error.message);
    json(res, 502, { error: 'Research is temporarily unavailable. Please try again; live data is never replaced with sample data.' });
  }
});
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Ziki Finance: http://${process.env.HOST || '127.0.0.1'}:${port}`));
  if (process.env.DAILY_BRIEFING_ENABLED !== 'false') startDailyScheduler();
}
