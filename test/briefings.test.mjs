import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('daily editions persist and deduplicate concurrent and repeated requests',async () => {
  const directory = await mkdtemp(join(tmpdir(),'ziki-finance-test-'));
  process.env.DATA_DIRECTORY = directory;
  process.env.FINNHUB_API_KEY = '';
  const { generateBriefing, readBriefings } = await import('../server/briefings.mjs');
  try {
    const [a,b] = await Promise.all([generateBriefing(),generateBriefing()]);
    assert.equal(a.id,b.id);
    assert.equal(a.reports.length,6);
    const again = await generateBriefing();
    assert.equal(again.id,a.id);
    assert.equal((await readBriefings()).length,1);
    const persisted = JSON.parse(await readFile(join(directory,'briefings.json'),'utf8'));
    assert.equal(persisted[0].mode,'demo');
    assert.equal(persisted[0].reports.length,6);
  } finally { await unlink(join(directory,'briefings.json')).catch(() => {}); await rmdir(directory); }
});
