import { fetchFred, latestFred, trend, trendArrow, MARKETAUX_API_KEY } from '@/lib/api';

export const dynamic = 'force-dynamic';

const ALPHA_VANTAGE_KEY = 'TO45QFIMZZB6CRXP';

async function fetchQuote(symbol: string) {
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`,
      { next: { revalidate: 300 } }
    );
    const data = await res.json();
    const q = data['Global Quote'];
    if (!q?.['05. price']) return null;
    return {
      price: parseFloat(q['05. price']),
      change: parseFloat(q['09. change']),
      pct: parseFloat(q['10. change percent']?.replace('%', '') ?? '0'),
    };
  } catch { return null; }
}

async function fetchSgdUsd() {
  try {
    const res = await fetch(
      'https://api.mas.gov.sg/api/action/datastore/search.json?resource_id=95932927-c8bc-4e7a-b484-68a66a24edfe&limit=1',
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const rec = data?.result?.records?.[0];
    if (rec) {
      const key = Object.keys(rec).find((k: string) => k.includes('usd_sgd'));
      if (key) return parseFloat(rec[key]);
    }
    return null;
  } catch { return null; }
}

async function fetchTopNews() {
  try {
    const url = `https://api.marketaux.com/v1/news/all?symbols=SPY,QQQ,EWS,NVDA&filter_entities=true&language=en&api_token=${MARKETAUX_API_KEY}&limit=3`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    const data = await res.json();
    return (data.data || []).slice(0, 3).map((a: { title: string; url: string; source: string; published_at: string; entities?: Array<{ sentiment_score?: number }> }) => ({
      title: a.title, url: a.url, source: a.source,
      publishedAt: a.published_at,
      sentiment: a.entities?.[0]?.sentiment_score ?? 0,
    }));
  } catch { return []; }
}

export default async function BriefPage() {
  const [fedObs, cpiObs, gdpObs, spy, qqq, ews, sgdUsd, news] = await Promise.all([
    fetchFred('FEDFUNDS', 2),
    fetchFred('CPIAUCSL', 3),
    fetchFred('A191RL1Q225SBEA', 3),
    fetchQuote('SPY'),
    fetchQuote('QQQ'),
    fetchQuote('EWS'),
    fetchSgdUsd(),
    fetchTopNews(),
  ]);

  const fed = latestFred(fedObs);
  const cpi = latestFred(cpiObs);
  const gdp = latestFred(gdpObs);

  const gdpUp = trend(gdp.current, gdp.prev) === 'up';
  const cpiDown = trend(cpi.current, cpi.prev) === 'down';

  let regime = 'Recovery', regimeEmoji = '🚀', regimeColor = '#10B981';
  if (gdpUp && cpiDown)       { regime = 'Recovery';    regimeEmoji = '🚀'; regimeColor = '#10B981'; }
  else if (gdpUp)              { regime = 'Boom';         regimeEmoji = '🔥'; regimeColor = '#3B82F6'; }
  else if (!gdpUp && !cpiDown) { regime = 'Recession';   regimeEmoji = '📉'; regimeColor = '#F59E0B'; }
  else                         { regime = 'Stagflation'; regimeEmoji = '⚠️'; regimeColor = '#EF4444'; }

  const today = new Date().toLocaleDateString('en-SG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const usdSgd = sgdUsd ? (1 / sgdUsd).toFixed(4) : '1.34';

  const topSignals = [
    { label: 'Fed Funds', value: `${fed.current ?? '—'}%`, note: fed.current && fed.current < 4 ? 'Easing cycle' : 'Restrictive' },
    { label: 'CPI Trend', value: cpiDown ? 'Cooling ↓' : 'Rising ↑', note: cpiDown ? 'Deflationary pressure' : 'Watch inflation' },
    { label: 'USD/SGD', value: usdSgd, note: parseFloat(usdSgd) > 1.35 ? 'SGD weak' : 'SGD firm' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Print button */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-lg font-semibold text-gray-300">Morning Brief</h1>
        <button
          onClick={() => window.print()}
          className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
        >
          🖨️ Print / Save PDF
        </button>
      </div>

      {/* Brief Card — print-optimized */}
      <div className="bg-white text-gray-900 rounded-2xl p-8 shadow-2xl brief-card">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-5">
          <div>
            <div className="text-2xl font-bold text-blue-700 tracking-tight">RISUN</div>
            <div className="text-xs text-gray-500 mt-0.5">Financial Intelligence for Singapore Advisors</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-800">{today}</div>
            <div className="text-xs text-gray-400 mt-0.5">Morning Brief</div>
          </div>
        </div>

        {/* Regime Badge */}
        <div className="flex items-center gap-3 mb-5 p-3 rounded-xl" style={{ background: `${regimeColor}15`, border: `1.5px solid ${regimeColor}40` }}>
          <span className="text-2xl">{regimeEmoji}</span>
          <div>
            <div className="text-sm font-bold" style={{ color: regimeColor }}>{regime.toUpperCase()} REGIME</div>
            <div className="text-xs text-gray-500">
              {regime === 'Recovery' && 'Growth expanding, inflation cooling — best environment for risk assets.'}
              {regime === 'Boom' && 'Strong growth, rising inflation — late cycle, watch rates.'}
              {regime === 'Stagflation' && 'Slowing growth, rising inflation — defensive positioning.'}
              {regime === 'Recession' && 'Contraction — bonds and quality assets outperform.'}
            </div>
          </div>
        </div>

        {/* Market Signals Row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {topSignals.map(s => (
            <div key={s.label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="text-xs text-gray-400 mb-0.5">{s.label}</div>
              <div className="text-base font-bold text-gray-800">{s.value}</div>
              <div className="text-xs text-gray-500">{s.note}</div>
            </div>
          ))}
        </div>

        {/* Market Prices */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'SPY (S&P 500)', data: spy },
            { label: 'QQQ (Nasdaq)', data: qqq },
            { label: 'EWS (STI Proxy)', data: ews },
          ].map(({ label, data }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="text-xs text-gray-400 mb-0.5">{label}</div>
              {data ? (
                <>
                  <div className="text-base font-bold text-gray-800">${data.price.toFixed(2)}</div>
                  <div className={`text-xs font-medium ${data.pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.pct >= 0 ? '+' : ''}{data.pct.toFixed(2)}%
                  </div>
                </>
              ) : <div className="text-sm text-gray-400">N/A</div>}
            </div>
          ))}
        </div>

        {/* Top 3 News */}
        <div className="mb-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Top Stories</div>
          <div className="space-y-2">
            {news.length > 0 ? news.map((n: { title: string; url: string; source: string; publishedAt: string; sentiment: number }, i: number) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-xs font-bold text-gray-400 mt-0.5 w-4">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 line-clamp-2">{n.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{n.source}</div>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                  n.sentiment > 0.1 ? 'bg-green-100 text-green-700' :
                  n.sentiment < -0.1 ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {n.sentiment > 0.1 ? '▲' : n.sentiment < -0.1 ? '▼' : '→'}
                </span>
              </div>
            )) : (
              <div className="text-xs text-gray-400">News unavailable — visit /news for full feed.</div>
            )}
          </div>
        </div>

        {/* SG Advisor Note */}
        <div className="p-3 rounded-xl border border-blue-200 bg-blue-50 mb-5">
          <div className="text-xs font-semibold text-blue-700 mb-1">🇸🇬 SG Advisor Note</div>
          <div className="text-xs text-blue-800">
            {regime === 'Recovery' && `Recovery regime → growth ILPs outperform CPF-OA (2.5%). Clients asking "is now a good time?" — the data says yes. Best entry for long-term wealth accumulation.`}
            {regime === 'Boom' && `Boom regime → markets are strong but inflation is rising. Emphasise inflation protection in fund selection. ILP growth funds still competitive vs CPF.`}
            {regime === 'Stagflation' && `Stagflation → income funds and defensive positioning. CPF-OA at 2.5% is relatively competitive. Emphasise capital preservation and income stability.`}
            {regime === 'Recession' && `Recession → defensive. CPF-SA at 4% is a strong guaranteed return. Position ILPs for long-term clients who can ride out the cycle.`}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
          <div className="text-xs text-gray-400">
            Data: FRED, MAS, MarketAux, Alpha Vantage
          </div>
          <div className="text-xs text-gray-400">
            For professional use only · Not investment advice
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
          .brief-card { box-shadow: none !important; }
          nav, footer { display: none !important; }
        }
      `}</style>
    </div>
  );
}
