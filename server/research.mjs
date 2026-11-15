const finite = value => typeof value === 'number' && Number.isFinite(value);
export const agentDefinitions = [
  { id: 'fundamentals', name: 'Atlas', role: 'Fundamental analyst', description: 'Revenue growth, profitability, and valuation.' },
  { id: 'momentum', name: 'Pulse', role: 'Market analyst', description: 'Daily price movement and the 52-week range.' },
  { id: 'news', name: 'Scout', role: 'News researcher', description: 'Recent company coverage and source links.' },
  { id: 'risk', name: 'Shield', role: 'Risk reviewer', description: 'Challenges the thesis and flags evidence gaps.' }
];
export function analyzeEvidence(evidence, now = Date.now()) {
  const { metrics: m, quote: q } = evidence;
  const stale = !q || !finite(q.price) || q.price <= 0 || !Number.isFinite(Date.parse(q.timestamp)) || Date.parse(q.timestamp) > now + 5 * 60000 || now - Date.parse(q.timestamp) > 96 * 3600000;
  const fundamentalAvailable = [m.revenueGrowth, m.pe, m.netMargin].every(finite) && m.pe > 0;
  let fundamental = 'Hold';
  if (fundamentalAvailable && m.revenueGrowth >= 10 && m.netMargin >= 10 && m.pe < 55) fundamental = 'Buy';
  if (fundamentalAvailable && (m.revenueGrowth < 0 || m.netMargin < 0) && m.pe > 50) fundamental = 'Reduce';
  const momentumAvailable = finite(q?.changePercent);
  const momentum = !momentumAvailable ? 'Unrated' : q.changePercent >= 1 ? 'Buy' : q.changePercent <= -2 ? 'Reduce' : 'Hold';
  const risks = [];
  if (finite(m.pe) && m.pe > 40) risks.push(`The ${m.pe.toFixed(1)}× P/E multiple increases sensitivity to earnings expectations.`);
  if (finite(m.revenueGrowth) && m.revenueGrowth < 0) risks.push(`Revenue growth is negative (${m.revenueGrowth.toFixed(1)}%).`);
  if (!fundamentalAvailable) risks.push('Fundamental evidence is incomplete or the earnings multiple is not positive; no directional consensus is issued.');
  if (stale) risks.push('The quote is missing or more than 96 hours old; directional research is suspended.');
  if (!evidence.news.length) risks.push('No recent news was returned. Material developments may be missing.');
  risks.push('A single-day move is not a technical trend. This model does not evaluate portfolio suitability or price targets.');
  const verdict = stale || !fundamentalAvailable || !momentumAvailable ? 'Unrated' : fundamental === 'Reduce' ? 'Reduce' : fundamental === 'Buy' && momentum !== 'Reduce' ? 'Buy' : 'Hold';
  const agents = [
    { ...agentDefinitions[0], verdict: fundamentalAvailable ? fundamental : 'Unrated', summary: fundamentalAvailable ? `Revenue growth of ${m.revenueGrowth.toFixed(1)}%, a ${m.netMargin.toFixed(1)}% net margin, and ${m.pe.toFixed(1)}× earnings inform this rules-based assessment.` : 'Insufficient fundamentals for an assessment.' },
    { ...agentDefinitions[1], verdict: stale ? 'Unrated' : momentum, summary: momentumAvailable ? `The stock moved ${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}% against its previous close. This is a daily momentum signal, not a forecast.` : 'No valid daily price movement was returned.' },
    { ...agentDefinitions[2], verdict: 'Context', summary: evidence.news.length ? `${evidence.news.length} recent article${evidence.news.length === 1 ? '' : 's'} collected. Headlines provide context; no automated sentiment score is inferred.` : 'No recent coverage available.' },
    { ...agentDefinitions[3], verdict: risks.length > 1 ? 'Caution' : 'Reviewed', summary: risks[0] }
  ];
  return { symbol: evidence.symbol, verdict, agents, risks, horizon: 'Research view · 1–3 months', methodology: 'Rules-based research v1. Buy requires revenue growth ≥10%, net margin ≥10%, positive P/E <55, and daily movement above −2%. Reduce requires declining revenue or losses with P/E >50. Other complete evidence yields Hold. Missing or stale evidence yields Unrated. News and risk agents provide context, not votes.', evidence, generatedAt: new Date(now).toISOString() };
}
