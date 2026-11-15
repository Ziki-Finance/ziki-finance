// Fictional research scenarios. These are UI examples, never current market facts.
export const companies = [
  { symbol: 'NVDA', name: 'NVIDIA', sector: 'Technology', color: '#76b900', mark: 'N', price: 142.87, change: 2.34, pe: 48.2, growth: 35.4, margin: 54.1, high: 153.13, low: 86.62, headline: 'AI infrastructure demand supports the growth thesis', risk: 'Elevated valuation leaves little room for an earnings miss.' },
  { symbol: 'AAPL', name: 'Apple', sector: 'Technology', color: '#182334', mark: 'a', price: 228.26, change: 0.86, pe: 34.8, growth: 5.1, margin: 26.3, high: 260.10, low: 164.08, headline: 'Services growth offsets a slower hardware cycle', risk: 'Premium valuation and modest revenue growth limit the margin of safety.' },
  { symbol: 'MSFT', name: 'Microsoft', sector: 'Technology', color: '#3978f6', mark: 'M', price: 428.76, change: 1.12, pe: 36.1, growth: 17.2, margin: 35.2, high: 468.35, low: 344.77, headline: 'Cloud growth and recurring revenue strengthen the outlook', risk: 'AI capital expenditure could weigh on free cash flow.' },
  { symbol: 'TSLA', name: 'Tesla', sector: 'Consumer cyclical', color: '#d53d44', mark: 'T', price: 248.50, change: -2.18, pe: 78.6, growth: -8.4, margin: 7.9, high: 299.29, low: 138.80, headline: 'Margin pressure puts the near-term thesis under review', risk: 'Slowing sales and a high earnings multiple create downside exposure.' },
  { symbol: 'AMZN', name: 'Amazon', sector: 'Consumer cyclical', color: '#d68716', mark: 'a', price: 207.09, change: 1.67, pe: 39.3, growth: 12.8, margin: 10.2, high: 233.00, low: 151.61, headline: 'Operating efficiency adds to a resilient cloud business', risk: 'Retail demand and infrastructure spending remain key uncertainties.' },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financial services', color: '#31547a', mark: 'J', price: 221.48, change: -0.42, pe: 13.4, growth: 8.6, margin: 29.3, high: 235.70, low: 164.30, headline: 'Earnings resilience meets an uncertain rate outlook', risk: 'Credit losses could rise if economic activity weakens.' }
];
export function fixtureEvidence(company) {
  return {
    symbol: company.symbol, name: company.name, sector: company.sector,
    quote: { price: company.price, changePercent: company.change, previousClose: company.price / (1 + company.change / 100), timestamp: '2026-11-13T21:00:00.000Z' },
    metrics: { pe: company.pe, revenueGrowth: company.growth, netMargin: company.margin, high52: company.high, low52: company.low },
    news: [{ title: company.headline, source: 'Sample research scenario', url: null, timestamp: '2026-11-13T16:00:00.000Z' }],
    mode: 'demo', fetchedAt: '2026-11-13T21:15:00.000Z', limitations: ['Fictional sample data. Connect Finnhub to research current market evidence.'],
    sources: [{ label: 'Illustrative scenario · not a live source', url: null }]
  };
}
