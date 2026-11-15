import { companies, fixtureEvidence } from './fixtures.mjs';
const cache = new Map();
const validNumber = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
export async function getEvidence(symbol, { key = process.env.FINNHUB_API_KEY, fetcher = fetch } = {}) {
  const company = companies.find(c => c.symbol === symbol);
  if (!company) throw new Error('Unsupported stock symbol');
  if (!key) return fixtureEvidence(company);
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.time < 15 * 60000) return cached.value;
  async function request(endpoint, params) {
    const url = new URL(`https://finnhub.io/api/v1/${endpoint}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const response = await fetcher(url, { headers: { 'X-Finnhub-Token': key }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`Market provider returned ${response.status}`);
    const data = await response.json();
    if (data?.error) throw new Error('Market provider rejected the request');
    return data;
  }
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const results = await Promise.allSettled([
    request('quote', { symbol }), request('stock/metric', { symbol, metric: 'all' }), request('company-news', { symbol, from: weekAgo, to: today })
  ]);
  if (results[0].status === 'rejected') throw new Error('Quotes are unavailable. Check your Finnhub key, plan, and rate limit.');
  const q = results[0].value;
  if (!(q.c > 0) || !(q.t > 0)) throw new Error('No valid quote returned by the market provider.');
  const m = results[1].status === 'fulfilled' ? results[1].value.metric || {} : {};
  const rawNews = results[2].status === 'fulfilled' && Array.isArray(results[2].value) ? results[2].value : [];
  const news = rawNews.slice(0, 6).map(n => ({ title: String(n.headline || ''), source: String(n.source || 'News'), url: /^https:\/\//.test(n.url) ? n.url : null, timestamp: new Date(n.datetime * 1000).toISOString() }));
  const value = {
    symbol, name: company.name, sector: company.sector, mode: 'live', fetchedAt: new Date().toISOString(),
    quote: { price: q.c, changePercent: validNumber(q.dp), previousClose: validNumber(q.pc), timestamp: new Date(q.t * 1000).toISOString() },
    metrics: { pe: validNumber(m.peTTM), revenueGrowth: validNumber(m.revenueGrowthTTMYoy), netMargin: validNumber(m.netProfitMarginTTM), high52: validNumber(m['52WeekHigh']), low52: validNumber(m['52WeekLow']) },
    news, limitations: ['Quotes may be delayed according to your data subscription. Financial metrics may have different reporting periods.', ...results.slice(1).flatMap((r, i) => r.status === 'rejected' ? [`${i === 0 ? 'Fundamentals' : 'News'} could not be loaded.`] : [])],
    sources: [{ label: 'Finnhub · quote', url: 'https://finnhub.io/docs/api/quote' }, { label: 'Finnhub · company financials', url: 'https://finnhub.io/docs/api/company-basic-financials' }, ...news.map(n => ({ label: n.source, url: n.url }))]
  };
  cache.set(symbol, { time: Date.now(), value });
  return value;
}
