import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.FINNHUB_API_KEY = '';
process.env.CRON_SECRET = 'test-secret';
const { server } = await import('../server/index.mjs');
let base;
before(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
test('application and assets are served with security headers', async () => {
  for (const path of ['/','/finance','/app.js','/styles.css','/favicon.svg']) {
    const response = await fetch(base+path);
    assert.equal(response.status,200);
    assert.ok(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
    await response.text();
  }
});
test('market API returns all supported reports and no credentials', async () => {
  const response = await fetch(base+'/api/market');
  const body = await response.json();
  assert.equal(body.reports.length,6);
  assert.ok(body.reports.every(r => r.evidence.mode === 'demo'));
  assert.equal(JSON.stringify(body).includes('test-secret'),false);
});
test('invalid symbols are rejected at the API boundary', async () => {
  const response = await fetch(base+'/api/research?symbol=%3Cscript%3E');
  assert.equal(response.status,400);
  await response.text();
});
test('a cron refresh requires an exact bearer secret', async () => {
  for (const authorization of ['', 'Bearer incorrect', 'test-secret']) {
    const response = await fetch(base+'/api/briefings/refresh',{method:'POST',headers:{authorization}});
    assert.equal(response.status,401);
    await response.text();
  }
});
test('unknown paths do not expose source or environment files', async () => {
  for (const path of ['/.env','/server/provider.mjs','/api/not-found']) {
    const response = await fetch(base+path);
    assert.equal(response.status,404);
    await response.text();
  }
});
