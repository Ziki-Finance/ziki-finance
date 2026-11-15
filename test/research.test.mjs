import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeEvidence } from '../server/research.mjs';
import { companies, fixtureEvidence } from '../server/fixtures.mjs';
import { getEvidence } from '../server/provider.mjs';
const now = Date.parse('2026-11-15T12:00:00Z');
const evidence = () => structuredClone(fixtureEvidence(companies[0]));
test('strong complete financials yield Buy with four attributable assessments', () => {
  const report = analyzeEvidence(evidence(), now);
  assert.equal(report.verdict, 'Buy');
  assert.equal(report.agents.length, 4);
  assert.ok(report.risks.length >= 2);
  assert.match(report.methodology, /Rules-based/);
});
test('declining growth and expensive valuation yield Reduce', () => {
  const report = analyzeEvidence(fixtureEvidence(companies.find(c => c.symbol === 'TSLA')), now);
  assert.equal(report.verdict, 'Reduce');
});
test('stale or invalid quotes suspend a directional verdict', () => {
  for (const timestamp of ['2020-01-01T00:00:00Z','invalid','2099-01-01T00:00:00Z']) {
    const e = evidence(); e.quote.timestamp = timestamp;
    assert.equal(analyzeEvidence(e, now).verdict, 'Unrated');
  }
});
test('missing financials and invalid earnings multiples never imply a buy', () => {
  for (const pe of [null, NaN, -2, 0]) {
    const e = evidence(); e.metrics.pe = pe;
    assert.equal(analyzeEvidence(e, now).verdict, 'Unrated');
  }
});
test('downward daily movement blocks a fundamental Buy', () => {
  const e = evidence(); e.quote.changePercent = -3;
  assert.equal(analyzeEvidence(e, now).verdict, 'Hold');
});
test('news is context rather than fabricated sentiment', () => {
  const e = evidence(); e.news = [];
  const report = analyzeEvidence(e, now);
  assert.equal(report.agents[2].verdict, 'Context');
  assert.ok(report.risks.some(r => r.includes('No recent news')));
});
test('sample mode does not call an external provider', async () => {
  const e = await getEvidence('AAPL', { key:'', fetcher:() => { throw new Error('Unexpected request'); } });
  assert.equal(e.mode,'demo');
});
test('provider failures do not silently switch live data to sample data', async () => {
  await assert.rejects(getEvidence('AAPL', { key:'test', fetcher:async () => ({ok:false,status:429}) }), /Quotes are unavailable/);
});
test('partial provider data remains live and produces Unrated', async () => {
  const e = await getEvidence('JPM', {key:'test', fetcher:async url => url.pathname.endsWith('/quote') ? {ok:true,json:async () => ({c:220,dp:1,pc:218,t:now/1000})} : {ok:false,status:403}});
  assert.equal(e.mode,'live');
  assert.equal(e.metrics.pe,null);
  assert.equal(e.news.length,0);
  assert.equal(analyzeEvidence(e,now).verdict,'Unrated');
  assert.ok(e.limitations.length >= 3);
});
test('unsupported symbols are rejected before provider access', async () => {
  await assert.rejects(getEvidence('../secret', {key:''}),/Unsupported/);
});
