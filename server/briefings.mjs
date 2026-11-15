import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { companies } from './fixtures.mjs';
import { getEvidence } from './provider.mjs';
import { analyzeEvidence } from './research.mjs';
const directory = resolve(process.env.DATA_DIRECTORY || './data');
let inFlight;
export async function readBriefings() {
  try { return JSON.parse(await readFile(resolve(directory, 'briefings.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
export async function generateBriefing() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const mode = process.env.FINNHUB_API_KEY ? 'live' : 'demo';
    const date = new Date().toISOString().slice(0, 10);
    const previous = await readBriefings();
    const existing = previous.find(b => b.date === date && b.mode === mode);
    if (existing) return existing;
    const reports = [], errors = [];
    // Sequential symbols keep provider bursts below typical rate limits.
    for (const company of companies) {
      try { reports.push(analyzeEvidence(await getEvidence(company.symbol))); }
      catch { errors.push(company.symbol); }
    }
    if (!reports.length) throw new Error('No market evidence available. Previous briefings are preserved.');
    const counts = { Buy: 0, Hold: 0, Reduce: 0, Unrated: 0 };
    reports.forEach(r => counts[r.verdict]++);
    const briefing = { id: `${mode}-${date}`, date, mode, generatedAt: new Date().toISOString(), title: mode === 'demo' ? 'A closer look at growth, value, and risk' : 'Your daily research briefing', summary: `${reports.length} stocks reviewed: ${counts.Buy} buy, ${counts.Hold} hold, ${counts.Reduce} reduce, and ${counts.Unrated} unrated. Review each thesis and its risks before making a decision.`, reports, errors, counts };
    await mkdir(directory, { recursive: true });
    const temp = resolve(directory, 'briefings.json.tmp');
    await writeFile(temp, JSON.stringify([briefing, ...previous].slice(0, 60), null, 2));
    await rename(temp, resolve(directory, 'briefings.json'));
    return briefing;
  })();
  try { return await inFlight; } finally { inFlight = null; }
}
export function startDailyScheduler() {
  // Generate after 22:00 UTC on weekdays. A persisted date+mode key prevents duplicates.
  const tick = async () => {
    const now = new Date();
    if (now.getUTCDay() > 0 && now.getUTCDay() < 6 && now.getUTCHours() >= 22) {
      try { await generateBriefing(); } catch (error) { console.error('Daily briefing:', error.message); }
    }
  };
  tick();
  const interval = setInterval(tick, 60000);
  interval.unref();
  return interval;
}
