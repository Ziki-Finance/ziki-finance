const $ = selector => document.querySelector(selector);
const icons = {
 overview:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 research:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 11l2-3 3 2"/>',
 star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
 brief:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
 agents:'<rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 3v4M2 12v4M22 12v4M9 16h6"/><circle cx="8.5" cy="12" r=".8"/><circle cx="15.5" cy="12" r=".8"/>',
 external:'<path d="M14 3h7v7M21 3l-9 9M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
 settings:'<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 bell:'<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4M12 2v2"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 spark:'<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6Z"/>',
 activity:'<path d="M2 12h5l3-8 4 16 3-8h5"/>',
 shield:'<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6ZM8 12l3 3 5-6"/>',
 sort:'<path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4"/>',
 menu:'<path d="M3 6h18M3 12h18M3 18h18"/>'
};
function icon(name) { return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.research}</svg>`; }
function hydrateIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon)); }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
function safeLink(url) { try { const u = new URL(url); return u.protocol === 'https:' ? esc(u.href) : ''; } catch { return ''; } }
const money = value => Number.isFinite(value) ? new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(value) : '—';
const percent = value => Number.isFinite(value) ? `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}%` : '—';
const number = (value, suffix = '') => Number.isFinite(value) ? `${value.toFixed(1)}${suffix}` : '—';
function time(value) { return new Date(value).toLocaleString(undefined, { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit', timeZoneName:'short' }); }
function badge(verdict) { return `<span class="verdict ${esc(verdict)}">${verdict === 'Buy' ? '↗' : verdict === 'Reduce' ? '↘' : verdict === 'Hold' ? '→' : '·'} ${esc(verdict)}</span>`; }
const state = { config:null, reports:[], page:'Overview', filter:'All', descending:false, watchlist:[], currentReport:null, requestId:0 };
try { const saved = JSON.parse(localStorage.getItem('ziki-finance-watchlist') || '["NVDA","AAPL","MSFT"]'); state.watchlist = Array.isArray(saved) ? saved.filter(x => typeof x === 'string') : []; } catch { state.watchlist = ['NVDA','AAPL','MSFT']; }
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').hidden = true, 3500); }
async function api(path) { const response = await fetch(path); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load research'); return data; }
function company(symbol) { return state.config.companies.find(c => c.symbol === symbol); }
function logo(symbol) { const c = company(symbol); return `<span class="company-logo logo-${esc(symbol)}" aria-hidden="true">${esc(c.mark)}</span>`; }
function change(value) { return `<span class="change ${value >= 0 ? 'positive' : 'negative'}">${percent(value)}</span>`; }
function stockLink(report) { return `<button class="stock-link" data-research="${esc(report.symbol)}">${logo(report.symbol)}<span class="company-name"><strong>${esc(report.evidence.name)}</strong><small>${esc(report.symbol)}</small></span></button>`; }
function saveButton(symbol) { const saved = state.watchlist.includes(symbol); return `<button class="star-button ${saved ? 'saved' : ''}" data-save="${esc(symbol)}" aria-label="${saved ? 'Remove' : 'Add'} ${esc(symbol)} ${saved ? 'from' : 'to'} watchlist" aria-pressed="${saved}">${icon('star')}</button>`; }
function renderTable() {
  let reports = state.reports.filter(r => (state.filter === 'All' || r.verdict === state.filter) && (state.page !== 'Watchlist' || state.watchlist.includes(r.symbol)));
  if (state.descending) reports = [...reports].sort((a,b) => (b.evidence.quote.changePercent ?? -Infinity) - (a.evidence.quote.changePercent ?? -Infinity));
  $('#stocks').innerHTML = reports.map(r => `<tr><td>${stockLink(r)}</td><td class="price">${money(r.evidence.quote.price)}</td><td>${change(r.evidence.quote.changePercent)}</td><td><button data-research="${esc(r.symbol)}" aria-label="Read ${esc(r.symbol)} ${esc(r.verdict)} research">${badge(r.verdict)}</button></td><td>${saveButton(r.symbol)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">No stocks in this view. Add a stock or try another filter.</td></tr>';
  $('#result-count').textContent = `${reports.length} of ${state.reports.length} stocks`;
  const saved = state.reports.filter(r => state.watchlist.includes(r.symbol));
  $('#watchlist-preview').innerHTML = saved.slice(0,3).map(r => `<div class="watch-item">${stockLink(r)}<div class="watch-price">${money(r.evidence.quote.price)}${change(r.evidence.quote.changePercent)}</div></div>`).join('') || '<div class="empty">Your next idea starts here.<br>Star a stock to follow its research.</div>';
  $('#watch-count').textContent = $('#watch-badge').textContent = state.watchlist.length;
}
function renderOverview() {
  $('#market-strip').innerHTML = state.reports.slice(0,4).map(r => `<div class="market-stat"><div class="stat-name"><strong>${esc(r.symbol)}</strong><span>${esc(r.evidence.sector === 'Technology' ? 'Technology' : r.evidence.name)}</span></div><span class="stat-value">${money(r.evidence.quote.price)}</span><span class="stat-change ${r.evidence.quote.changePercent >= 0 ? 'positive' : 'negative'}">${percent(r.evidence.quote.changePercent)}</span></div>`).join('');
  const counts = { Buy:0, Hold:0, Reduce:0, Unrated:0 };
  state.reports.forEach(r => counts[r.verdict]++);
  $('#buy-count').textContent = counts.Buy;
  $('#signal-bar').innerHTML = state.reports.map(r => `<span class="${r.verdict.toLowerCase()}" title="${esc(r.symbol)}: ${esc(r.verdict)}"></span>`).join('');
  $('#signal-legend').innerHTML = ['Buy','Hold','Reduce', ...(counts.Unrated ? ['Unrated'] : [])].map(v => `<span class="${v.toLowerCase()}"><i></i>${v} <b>${counts[v]}</b></span>`).join('');
  $('#evidence-label').textContent = state.config.mode === 'demo' ? 'Sample research universe' : 'Finnhub · quotes may be delayed';
  $('.count-badge').textContent = `${state.reports.length} stocks`;
  if (state.config.mode === 'live') {
    $('#data-banner').innerHTML = '<span class="status-dot blue"></span><span><strong>Connected to Finnhub</strong> · Quotes may be delayed. Check source times in each report.</span><button id="refresh-market">Refresh research ↻</button>';
    $('.sample-label').textContent = 'Evidence-led research';
  }
}
function navigate(page) {
  state.page = page; state.filter = 'All';
  document.querySelectorAll('[data-page]').forEach(b => { b.classList.toggle('active',b.dataset.page === page); if (b.dataset.page === page) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
  document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('selected', b.dataset.filter === 'All'));
  const headings = { Overview:['Finance overview','Less market noise. More informed decisions.'], Research:['Stock research','Follow the evidence behind every opportunity.'], Watchlist:['Your watchlist','A closer view of the companies you care about.'], Briefings:['Daily briefings','Your market perspective, one day at a time.'], Agents:['Research agents','Four perspectives. Every assessment on the record.'] };
  $('#page-title').innerHTML = `${headings[page][0]}<span class="heading-dot">.</span>`;
  $('#page-subtitle').textContent = headings[page][1];
  $('#overview-content').hidden = page !== 'Overview';
  $('#research-content').hidden = !['Overview','Research','Watchlist'].includes(page);
  $('#briefings-content').hidden = page !== 'Briefings';
  $('#agents-content').hidden = page !== 'Agents';
  $('main').classList.toggle('wide',page !== 'Overview');
  $('#table-title').innerHTML = page === 'Watchlist' ? 'Companies you’re following' : page === 'Research' ? 'The research universe' : 'On the agents’ radar';
  $('#table-description').textContent = page === 'Watchlist' ? 'Saved on this device. Select a company to inspect its research.' : 'Independent perspectives. Evidence you can inspect.';
  $('#view-all').hidden = page !== 'Overview';
  $('#sidebar').classList.remove('open');
  if (page === 'Briefings') renderBriefings();
  if (page === 'Agents') renderAgents();
  renderTable();
  history.replaceState(null,'',`#${page.toLowerCase()}`);
}
function saveStock(symbol) {
  if (!company(symbol)) return;
  const saved = state.watchlist.includes(symbol);
  state.watchlist = saved ? state.watchlist.filter(s => s !== symbol) : [...state.watchlist,symbol];
  try { localStorage.setItem('ziki-finance-watchlist',JSON.stringify(state.watchlist)); } catch { toast('Storage unavailable; watchlist changes last for this session.'); }
  renderTable();
  const reportButton = $('#report-save');
  if (reportButton && state.currentReport?.symbol === symbol) reportButton.textContent = `${saved ? '☆ Add to' : '★ Saved to'} watchlist`;
  toast(`${symbol} ${saved ? 'removed from' : 'added to'} your watchlist`);
}
function openSearch() { renderSearch(''); $('#search-dialog').showModal(); $('#stock-search').value = ''; $('#stock-search').focus(); }
function renderSearch(query) {
  const matches = state.config.companies.filter(c => `${c.symbol} ${c.name}`.toLowerCase().includes(query.toLowerCase()));
  $('#search-results').innerHTML = matches.map(c => `<button class="search-result" data-search-symbol="${esc(c.symbol)}">${logo(c.symbol)}<span class="company-name"><strong>${esc(c.name)}</strong><small>${esc(c.symbol)} · ${esc(c.sector)}</small></span><span>↗</span></button>`).join('') || '<div class="empty">No matching stock in this universe.</div>';
}
async function openResearch(symbol) {
  $('#search-dialog').close();
  const dialog = $('#research-dialog');
  if (!dialog.open) dialog.showModal();
  const requestId = ++state.requestId;
  $('#research-dialog-content').innerHTML = '<div class="loading">Collecting evidence and agent assessments…</div>';
  try {
    const report = await api(`/api/research?symbol=${encodeURIComponent(symbol)}`);
    if (requestId !== state.requestId || !dialog.open) return;
    state.currentReport = report;
    renderReport(report);
  } catch (error) { if (requestId === state.requestId && dialog.open) $('#research-dialog-content').innerHTML = `<div class="report-body"><div class="dialog-top"><h2>Research unavailable</h2><button class="icon-button" data-close aria-label="Close research">×</button></div><p class="error">${esc(error.message)}</p><button class="button primary" data-research="${esc(symbol)}">Try again</button></div>`; }
}
function renderReport(r) {
  const e = r.evidence, m = e.metrics;
  $('#research-dialog-content').innerHTML = `<div class="report-header"><div class="dialog-top"><div class="report-title">${logo(r.symbol)}<div><h2>${esc(e.name)}</h2><p>${esc(r.symbol)} · ${esc(e.sector)} · USD</p></div></div><button class="icon-button" data-close aria-label="Close research">×</button></div><div class="report-price"><strong>${money(e.quote.price)}</strong>${change(e.quote.changePercent)}${badge(r.verdict)}</div></div><div class="report-body">${e.mode === 'demo' ? '<div class="report-warning"><strong>Sample research.</strong> Prices, financials, and headlines are fictional scenarios. These signals are for exploring the product.</div>' : ''}<div class="report-meta"><span>Quote: ${esc(time(e.quote.timestamp))}</span><span>·</span><span>Assessed: ${esc(time(r.generatedAt))}</span><span>· ${esc(r.horizon)}</span></div><div class="metrics-grid">${[['P/E · TTM',number(m.pe,'×')],['Revenue growth · YoY',number(m.revenueGrowth,'%')],['Net margin · TTM',number(m.netMargin,'%')],['52-week high',money(m.high52)]].map(([label,value]) => `<div class="metric"><small>${label}</small><strong>${value}</strong></div>`).join('')}</div><section class="report-section"><h3>The agents’ perspectives</h3>${r.agents.map(a => `<div class="agent-verdict"><span class="agent-face ${a.name}">${a.name[0]}</span><div class="agent-info"><strong>${a.name}</strong><small>${a.role}</small><p>${esc(a.summary)}</p></div>${badge(a.verdict)}</div>`).join('')}</section><section class="report-section risk-box"><h3>What could challenge the thesis</h3><ul class="risk-list">${r.risks.map(risk => `<li>${esc(risk)}</li>`).join('')}</ul></section><section class="report-section"><h3>News & evidence</h3>${e.news.length ? e.news.map(n => `<div class="news-item">${safeLink(n.url) ? `<a href="${safeLink(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.title)} ↗</a>` : `<span>${esc(n.title)}</span>`}<p>${esc(n.source)} · ${esc(time(n.timestamp))}</p></div>`).join('') : '<p class="muted">No recent articles were returned.</p>'}<div class="source-links">${e.sources.filter(s => safeLink(s.url)).map(s => `<a href="${safeLink(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a>`).join('')}</div></section><section class="report-section"><details class="methodology"><summary>How this verdict was reached</summary><p>${esc(r.methodology)}</p><p>These are deterministic specialist research agents, not an LLM consensus or a probability of return. The risk review and news collection inform your assessment but do not cast directional votes.</p></details></section><p class="muted report-section">${e.limitations.map(esc).join(' ')} No orders are placed by this application.</p></div><div class="report-actions"><button class="button primary" id="report-save" data-save="${esc(r.symbol)}">${state.watchlist.includes(r.symbol) ? '★ Saved to' : '☆ Add to'} watchlist</button><button class="button" id="export-report">${icon('brief')} Export research</button></div>`;
}
function exportReport() {
  const r = state.currentReport;
  if (!r) return;
  const text = `ZIKI FINANCE — ${r.symbol}\n${r.evidence.mode === 'demo' ? 'FICTIONAL SAMPLE DATA\n' : ''}Verdict: ${r.verdict}\nQuote: ${money(r.evidence.quote.price)} at ${r.evidence.quote.timestamp}\nAssessed: ${r.generatedAt}\n\n${r.agents.map(a => `${a.name} — ${a.role} (${a.verdict})\n${a.summary}`).join('\n\n')}\n\nRISKS\n${r.risks.map(risk => `• ${risk}`).join('\n')}\n\nMETHODOLOGY\n${r.methodology}\n\nSOURCES\n${r.evidence.sources.map(s => `${s.label}${s.url ? ': ' + s.url : ''}`).join('\n')}\n\nResearch signals, not personalised investment advice.`;
  const url = URL.createObjectURL(new Blob([text],{type:'text/plain'}));
  const anchor = document.createElement('a'); anchor.href=url; anchor.download=`ziki-${r.symbol}-research.txt`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  toast('Research report exported');
}
function renderAgents() {
  $('#agents-content').innerHTML = `<div class="report-warning">Transparent by design. These specialist agents use published rules and provider evidence. They do not claim predictive accuracy or act as personal financial advisers.</div><div class="agents-grid">${state.config.agents.map(a => `<article class="card agent-card"><span class="agent-face ${a.name}">${a.name[0]}</span><h2>${a.name}</h2><small>${a.role}</small><p>${a.description}</p><span class="verdict Context">Rules-based specialist</span></article>`).join('')}</div><div class="report-section methodology"><strong>From evidence to perspective</strong><p>1. Collect company financials, a timestamped quote, and recent coverage. 2. Run the fundamental and market rules. 3. Review risks and evidence gaps. 4. Publish the assessment with its sources. Unavailable evidence stays visible.</p><p>Buy, Hold, and Reduce describe a general research view. “Reduce” invites a review of existing exposure, not an instruction to sell. Research covers six US-listed companies in this first release.</p></div>`;
}
async function renderBriefings() {
  $('#briefings-content').innerHTML = '<div class="card loading">Loading your daily perspectives…</div>';
  try {
    const { briefings } = await api('/api/briefings');
    const matching = briefings.filter(b => b.mode === state.config.mode);
    const latest = matching[0];
    const reports = latest?.reports || state.reports;
    $('#briefings-content').innerHTML = `<article class="card briefing-feature"><span class="verdict Context">${latest ? (latest.mode === 'demo' ? 'Sample briefing' : 'Daily briefing') : 'On-demand research snapshot'}</span><h2>${esc(latest?.title || 'The companies behind the market noise.')}</h2><p>${esc(latest?.summary || 'Explore the current research universe, from growth opportunities to the risks that deserve a second look. Each company has an evidence-led assessment from four specialist agents.')}</p><p class="muted report-section">${latest ? `Generated ${esc(time(latest.generatedAt))}.` : 'No scheduled briefing has been generated yet.'} Daily snapshots run at 22:00 UTC on weekdays while the server is running. ${state.config.mode === 'demo' ? 'This workspace uses fictional sample evidence.' : 'Only the six supported companies are covered; this is not a broad-market index report.'}</p></article><div class="briefing-grid">${reports.map(r => `<article class="card briefing-stock"><div class="section-top">${logo(r.symbol)}${badge(r.verdict)}</div><h3>${esc(r.evidence.name)} <span class="muted">${esc(r.symbol)}</span></h3><p>${esc(r.agents[0].summary)}</p><button class="text-button" data-research="${esc(r.symbol)}">Read current research ↗</button></article>`).join('')}</div>${latest?.errors?.length ? `<div class="error report-section">Evidence unavailable for ${latest.errors.map(esc).join(', ')}. This briefing is partial.</div>` : ''}<div class="briefing-history"><h3>Briefing archive</h3>${matching.length ? matching.map(b => `<button data-briefing="${esc(b.id)}">${esc(b.date)} · ${esc(b.title)} · ${b.reports.length} companies ↗</button>`).join('') : '<p class="muted report-section">Scheduled snapshots will appear here. To generate the first one, run <code>npm run briefing</code> on the server.</p>'}</div>`;
    state.briefings = matching;
  } catch (error) { $('#briefings-content').innerHTML = `<div class="error">${esc(error.message)}</div>`; }
}
function openSettings(how = false) {
  $('#settings-body').innerHTML = `<div class="settings-content"><span class="verdict Context">${state.config.mode === 'demo' ? 'Sample mode' : 'Finnhub connected'}</span><h3>${how ? 'Your agents bring the evidence' : 'Connect live market data'}</h3><p>Atlas reviews fundamentals. Pulse assesses daily movement. Scout collects company coverage. Shield flags risks and missing evidence. Every report shows the rules behind its verdict.</p><p>To enable live evidence, add a Finnhub API key to the server’s <code>.env</code> file as <code>FINNHUB_API_KEY</code>, then restart the server. Your key stays on the server. <a href="https://finnhub.io" target="_blank" rel="noreferrer">Get a Finnhub key ↗</a></p><h3>Daily briefings</h3><p>The running server saves a daily snapshot at 22:00 UTC on weekdays. For an external scheduler, configure <code>CRON_SECRET</code> and POST to <code>/api/briefings/refresh</code> with the bearer secret. Run <code>npm run briefing</code> to generate a snapshot manually.</p><h3>Your watchlist</h3><p>Saved in this browser on this device. No brokerage account is connected and no trades are executed.</p><h3>Before relying on a verdict</h3><p>Data may be delayed or incomplete. These transparent rules produce general research signals; they do not evaluate your financial situation, predict returns, or replace professional advice.</p></div>`;
  $('#settings-dialog').showModal();
}
async function loadMarket() {
  $('#error').hidden = true;
  try {
    const { reports, errors } = await api('/api/market');
    state.reports = reports;
    renderOverview(); renderTable();
    if (errors.length) { $('#error').textContent = `Research unavailable for ${errors.join(', ')}. The remaining evidence is shown.`; $('#error').hidden = false; }
  } catch (error) { $('#error').textContent = error.message; $('#error').hidden = false; $('#stocks').innerHTML = '<tr><td colspan="5" class="empty">Market data unavailable. Check Data & settings, then reload.</td></tr>'; $('#market-strip').innerHTML = '<div class="skeleton">Market evidence unavailable.</div>'; }
}
document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-close')) return button.closest('dialog').close();
  if (button.dataset.page) return navigate(button.dataset.page);
  if (button.dataset.save) return saveStock(button.dataset.save);
  if (button.dataset.research) return openResearch(button.dataset.research);
  if (button.dataset.searchSymbol) return openResearch(button.dataset.searchSymbol);
  if (button.dataset.filter) { state.filter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('selected',b === button)); return renderTable(); }
  if (button.dataset.briefing) {
    const b = state.briefings.find(b => b.id === button.dataset.briefing);
    if (!b) return;
    state.currentReport = null;
    $('#research-dialog-content').innerHTML = `<div class="report-body"><div class="dialog-top"><h2>${esc(b.date)} briefing</h2><button class="icon-button" data-close aria-label="Close briefing">×</button></div><p class="muted">${esc(b.summary)} ${b.mode === 'demo' ? 'Fictional sample evidence.' : ''}</p>${b.reports.map(r => `<div class="agent-verdict"><div class="agent-info"><strong>${esc(r.symbol)} · ${esc(r.evidence.name)}</strong><p>${esc(r.agents[0].summary)}</p><p>Quote as of ${esc(time(r.evidence.quote.timestamp))}</p><p>${r.risks.map(esc).join(' ')}</p></div>${badge(r.verdict)}</div>`).join('')}</div>`;
    return $('#research-dialog').showModal();
  }
  switch (button.id) {
    case 'new-research': case 'search-trigger': case 'add-watch': return openSearch();
    case 'open-watchlist': return navigate('Watchlist');
    case 'read-brief': case 'notification': return navigate('Briefings');
    case 'view-all': return navigate('Research');
    case 'meet-agents': return navigate('Agents');
    case 'settings': case 'connect-data': case 'workspace': return openSettings();
    case 'how-it-works': return openSettings(true);
    case 'sort': state.descending = !state.descending; button.setAttribute('aria-pressed',String(state.descending)); toast(state.descending ? 'Sorted by daily change, highest first' : 'Default company order restored'); return renderTable();
    case 'menu': return $('#sidebar').classList.toggle('open');
    case 'refresh-market': button.disabled = true; await loadMarket(); button.disabled = false; return;
    case 'export-report': return exportReport();
  }
});
$('#stock-search').addEventListener('input', e => renderSearch(e.target.value));
document.addEventListener('keydown', e => { if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName) && !document.querySelector('dialog[open]')) { e.preventDefault(); if (state.config) openSearch(); } });
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click',event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }));
hydrateIcons();
$('#search-trigger').setAttribute('aria-label','Search stocks');
$('#today').textContent = new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});
$('#year').textContent = new Date().getFullYear();
try {
  state.config = await api('/api/config');
  state.watchlist = [...new Set(state.watchlist.filter(s => company(s)))];
  await loadMarket();
  const page = ['Overview','Research','Watchlist','Briefings','Agents'].find(p => `#${p.toLowerCase()}` === location.hash) || 'Overview';
  navigate(page);
} catch (error) { $('#error').textContent = error.message; $('#error').hidden = false; }
