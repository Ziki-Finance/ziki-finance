import { generateBriefing } from '../server/briefings.mjs';
try { const briefing = await generateBriefing(); console.log(`${briefing.id}: ${briefing.summary}`); }
catch (error) { console.error(error.message); process.exitCode = 1; }
