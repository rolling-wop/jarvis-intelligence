import { fetchFred, latestFred, trend, trendArrow, trendColor, cpiYoY, sparklineValues, MARKETAUX_API_KEY, ALPHA_VANTAGE_KEY } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface Article {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  description: string;
  sentiment: number;
  symbol: string;
}

interface MarketItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
}

async function fetchQuote(symbol: string): Promise<MarketItem | null> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 300 } } as RequestInit);
    const data = await res.json();
    const q = data['Global Quote'];
    if (!q || !q['05. price']) return null;
    return {
      symbol,
      price: parseFloat(q['05. price']),
      change: parseFloat(q['09. change']),
      changePercent: q['10. change percent']?.replace('%', '') ?? '0',
    };
  } catch { return null; }
}

async function fetchSgdUsd(): Promise<number | null> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      'https://api.mas.gov.sg/api/action/datastore/search.json?resource_id=95932927-c8bc-4e7a-b484-68a66a24edfe&limit=1',
      { signal: controller.signal, next: { revalidate: 3600 } } as RequestInit
    );
    const data = await res.json();
    const records = data?.result?.records;
    if (records?.[0]) {
      const rec = records[0];
      const keys = Object.keys(rec).filter((k: string) => k !== '_id' && k !== 'end_of_day');
      const key = keys.find((k: string) => k.includes('usd_sgd') || k.includes('sgd_usd') || k.toLowerCase().includes('usd'));
      if (key && rec[key]) return parseFloat(rec[key]);
    }
    return null;
  } catch { return null; }
}

async function fetchTopNews(): Promise<Article[]> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);
    const symbols = 'SPY,QQQ,EWS,NVDA,TLT';
    const url = `https://api.marketaux.com/v1/news/all?symbols=${symbols}&filter_entities=true&language=en&api_token=${MARKETAUX_API_KEY}&limit=5`;
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 1800 } } as RequestInit);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).slice(0, 5).map((a: {
      title: string; url: string; source: string; published_at: string; description: string;
      entities?: Array<{ sentiment_score?: number; symbol?: string }>;
    }) => ({
      title: a.title, url: a.url, source: a.source, publishedAt: a.published_at,
      description: a.description ?? '',
      sentiment: a.entities?.[0]?.sentiment_score ?? 0,
      symbol: a.entities?.[0]?.symbol ?? '',
    }));
  } catch { return []; }
}

// ─── UI Components ──────────────────────────────────────────────────────────

function SentimentBadge({ score }: { score: number }) {
  if (score > 0.1) return <span className="badge-bullish">Bullish</span>;
  if (score < -0.1) return <span className="badge-bearish">Bearish</span>;
  return <span className="badge-neutral">Neutral</span>;
}

function MarketStrip({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="market-strip-item flex-shrink-0">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className={`text-xs font-mono font-medium ${color || 'text-white'}`}>{value}</span>
      {sub && <span className={`text-xs ${parseFloat(sub) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {parseFloat(sub) >= 0 ? '+' : ''}{sub}%
      </span>}
    </div>
  );
}

function Sparkline({ values, positive = true }: { values: number[]; positive?: boolean }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.01;
  const w = 52, h = 18;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const rising = values[values.length - 1] >= values[0];
  const stroke = positive ? (rising ? '#22C55E' : '#EF4444') : (rising ? '#EF4444' : '#22C55E');
  const last = pts.split(' ').pop()?.split(',') ?? ['0', '0'];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-70 flex-shrink-0">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2" fill={stroke} />
    </svg>
  );
}

function FearGreedGauge({ score }: { score: number }) {
  const cx = 120, cy = 108, r = 85;
  const color = score < 20 ? '#EF4444' : score < 40 ? '#F97316' : score < 60 ? '#EAB308' : score < 80 ? '#22C55E' : '#16A34A';
  const label = score < 20 ? 'Extreme Fear' : score < 40 ? 'Fear' : score < 60 ? 'Neutral' : score < 80 ? 'Greed' : 'Extreme Greed';

  // score=0 → angle=π (left), score=100 → angle=0 (right), through top
  const scoreAngle = Math.PI - (Math.max(0, Math.min(100, score)) / 100) * Math.PI;
  const endX = (cx + r * Math.cos(scoreAngle)).toFixed(2);
  const endY = (cy - r * Math.sin(scoreAngle)).toFixed(2);
  const needleX = (cx + r * 0.76 * Math.cos(scoreAngle)).toFixed(2);
  const needleY = (cy - r * 0.76 * Math.sin(scoreAngle)).toFixed(2);

  const bgPath = `M ${cx - r},${cy} A ${r},${r} 0 0,0 ${cx + r},${cy}`;
  const la = score > 50 ? 1 : 0;
  const scorePath = score <= 0 ? '' : score >= 100 ? bgPath : `M ${cx - r},${cy} A ${r},${r} 0 ${la},0 ${endX},${endY}`;

  // Zone segments
  const zones = [
    { from: 0, to: 20, c: '#EF444430' },
    { from: 20, to: 40, c: '#F9731630' },
    { from: 40, to: 60, c: '#EAB30830' },
    { from: 60, to: 80, c: '#22C55E30' },
    { from: 80, to: 100, c: '#16A34A30' },
  ];

  return (
    <div className="flex flex-col items-center">
      <svg width="240" height="130" viewBox="0 0 240 130" className="block">
        {zones.map(({ from, to, c }) => {
          const a1 = Math.PI - (from / 100) * Math.PI;
          const a2 = Math.PI - (to / 100) * Math.PI;
          const x1 = (cx + r * Math.cos(a1)).toFixed(2);
          const y1 = (cy - r * Math.sin(a1)).toFixed(2);
          const x2 = (cx + r * Math.cos(a2)).toFixed(2);
          const y2 = (cy - r * Math.sin(a2)).toFixed(2);
          const zla = (to - from) > 50 ? 1 : 0;
          return <path key={from} d={`M ${x1},${y1} A ${r},${r} 0 ${zla},0 ${x2},${y2}`} fill="none" stroke={c} strokeWidth="14" />;
        })}
        <path d={bgPath} fill="none" stroke="#1F2937" strokeWidth="14" strokeLinecap="round" />
        {score > 0 && <path d={scorePath} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill="white" />
        <text x={cx} y={cy - 22} textAnchor="middle" fill="white" fontSize="28" fontWeight="700">{score}</text>
        <text x={cx} y={cy - 7} textAnchor="middle" fill={color} fontSize="9" fontWeight="600" letterSpacing="1">{label.toUpperCase()}</text>
        <text x={cx - r + 4} y={cy + 18} textAnchor="middle" fill="#4B5563" fontSize="7">FEAR</text>
        <text x={cx} y="14" textAnchor="middle" fill="#4B5563" fontSize="7">NEUTRAL</text>
        <text x={cx + r - 4} y={cy + 18} textAnchor="middle" fill="#4B5563" fontSize="7">GREED</text>
      </svg>
      <div className="text-xs text-gray-500 text-center mt-1">
        Macro Fear &amp; Greed · Based on GDP, CPI, rates &amp; VIX
      </div>
    </div>
  );
}

// ─── Static Data ─────────────────────────────────────────────────────────────

const REGIME_EXPLANATIONS: Record<string, { plain: string; sgMeaning: string; cpfNote: string }> = {
  Recovery: {
    plain: 'The economy is growing and inflation is cooling — the sweet spot for markets. Risk assets like equities tend to perform well.',
    sgMeaning: 'Singapore equities and REITs typically rally in recovery. SGD stays firm. Good environment for ILP growth funds.',
    cpfNote: 'In Recovery, a diversified ILP may significantly outperform CPF-OA\'s 2.5% floor. Opportunity cost of staying in CPF is highest here.',
  },
  Boom: {
    plain: 'Strong growth but inflation is heating up. Markets are euphoric but central banks will likely hike rates to cool things down.',
    sgMeaning: 'Commodities and REITs with pricing power do well. MAS may tighten SGD. Good time for clients to review inflation protection.',
    cpfNote: 'ILP equity returns may still beat CPF but volatility is rising. Suggest clients review allocation before rates bite.',
  },
  Stagflation: {
    plain: 'The worst of both worlds — slow growth and high inflation. Traditional portfolios struggle. Gold and commodities outperform.',
    sgMeaning: 'Singapore, being import-dependent, feels stagflation acutely. SGD appreciation by MAS partially offsets imported inflation.',
    cpfNote: 'CPF-OA at 2.5% is actually competitive vs negative real returns on many funds. Capital preservation message works well here.',
  },
  Slowdown: {
    plain: 'Growth is decelerating and inflation is cooling. Late-cycle positioning — quality over quantity in portfolios.',
    sgMeaning: 'Singapore trade-sensitive sectors face headwinds. Defensive REITs and dividend stocks hold up better.',
    cpfNote: 'CPF-SA at 4% looks attractive relative to slowing equity returns. Balanced ILP allocations make sense here.',
  },
};

const FA_TALKING_POINTS: Record<string, { newProspect: string; existingClient: string; objection: string }> = {
  Recovery: {
    newProspect: '"The macro data right now is genuinely encouraging — GDP is growing, inflation is cooling. Historically this is when long-term investors who act see the biggest compounding gains. The question isn\'t whether to plan. It\'s what instrument fits your timeline."',
    existingClient: '"Good news — your funds are in a recovery environment. Growth ILPs are typically outperforming CPF-OA right now. Let\'s review your allocation and consider tilting toward higher growth exposure while conditions are favorable."',
    objection: '"Should I wait for a better time?" → "Recovery IS the better time. Waiting for perfect conditions costs compounding years. Starting today vs 12 months from now can mean $20K-40K extra at the same monthly contribution."',
  },
  Boom: {
    newProspect: '"Markets are running hot right now — which creates urgency. Late-cycle is when inflation starts eating into unprotected savings. A structured plan locks in today\'s growth potential while building downside protection before the turn."',
    existingClient: '"We\'re in boom conditions — great for your equity exposure. But this is also when inflation starts to bite. Let\'s make sure your ILP fund mix has some inflation-linked assets, not just pure growth."',
    objection: '"Markets are too high to invest now." → "History shows time in the market beats timing the market. But more importantly, your ILP builds over 10-20 years — a boom today is just one chapter in a much longer story."',
  },
  Stagflation: {
    newProspect: '"Right now is one of the most important times to have a structured financial plan. Stagflation means your savings account is losing real value every month — but instruments with guaranteed returns or income components can preserve and grow your wealth."',
    existingClient: '"Stagflation is the hardest environment for unmanaged portfolios. The good news — your plan has a guaranteed component. Let\'s review whether your fund allocation should tilt more defensive while we wait for conditions to improve."',
    objection: '"The economy is uncertain, I\'ll wait." → "Waiting in a savings account paying 0.05% while inflation runs hot is the riskiest move. You\'re losing purchasing power guaranteed. A structured plan gives you optionality either way."',
  },
  Slowdown: {
    newProspect: '"We\'re in a late-cycle environment — growth is slowing but inflation is cooling. This is actually a good time to lock in a plan before a potential rate-cutting cycle supercharges bond and balanced fund returns."',
    existingClient: '"Late cycle calls for a portfolio review. Slowing growth can pressure pure equity funds, but your balanced allocation should hold up. Let\'s check if we need to rebalance toward more defensive sub-funds."',
    objection: '"I\'m worried about a recession." → "Slowdowns are normal and expected. The key is having a plan BEFORE they hit — not scrambling during one. Clients who stay invested through slowdowns are consistently better off than those who panic out."',
  },
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default async function Dashboard() {
  const [fedFundsObs, cpiObs, gdpObs, unemploymentObs, treasury10yObs, vixObs,
    spy, qqq, ews, sgdUsd, news] = await Promise.all([
    fetchFred('FEDFUNDS', 6),
    fetchFred('CPIAUCSL', 14),
    fetchFred('A191RL1Q225SBEA', 4),
    fetchFred('UNRATE', 6),
    fetchFred('GS10', 6),
    fetchFred('VIXCLS', 6),
    fetchQuote('SPY').catch(() => null),
    fetchQuote('QQQ').catch(() => null),
    fetchQuote('EWS').catch(() => null),
    fetchSgdUsd().catch(() => null),
    fetchTopNews().catch(() => [] as Article[]),
  ]);

  const fedFunds = latestFred(fedFundsObs);
  const cpi = latestFred(cpiObs);
  const gdp = latestFred(gdpObs);
  const unemployment = latestFred(unemploymentObs);
  const treasury10y = latestFred(treasury10yObs);
  const vix = latestFred(vixObs);

  // ── CPI: compute YoY instead of raw index ──
  const cpiDisplay = cpiYoY(cpiObs);

  const gdpTrend = trend(gdp.current, gdp.prev);
  const cpiTrend = trend(cpiDisplay.current, cpiDisplay.prev); // now uses YoY trend, not raw index

  // ── Regime (4-quadrant macro model) ──
  let regime = 'Recovery', regimeColor = 'green';
  if (gdpTrend === 'up' && cpiTrend === 'down') {
    regime = 'Recovery'; regimeColor = 'green';
  } else if (gdpTrend === 'up' && cpiTrend !== 'down') {
    regime = 'Boom'; regimeColor = 'blue';
  } else if (gdpTrend !== 'up' && cpiTrend === 'up') {
    regime = 'Stagflation'; regimeColor = 'red';
  } else {
    regime = 'Slowdown'; regimeColor = 'orange';
  }
  const regimeInfo = REGIME_EXPLANATIONS[regime] || REGIME_EXPLANATIONS['Recovery'];
  const talkingPoints = FA_TALKING_POINTS[regime] || FA_TALKING_POINTS['Recovery'];

  // ── Fear & Greed Score (0=Fear, 100=Greed) ──
  let score = 50;
  if (gdpTrend === 'up') score += 10; else if (gdpTrend === 'down') score -= 10;
  if (cpiTrend === 'down') score += 10; else if (cpiTrend === 'up') score -= 10;
  if (trend(unemployment.current, unemployment.prev) === 'down') score += 5;
  else if (trend(unemployment.current, unemployment.prev) === 'up') score -= 5;
  if (trend(treasury10y.current, treasury10y.prev) === 'up') score -= 5;
  else if (trend(treasury10y.current, treasury10y.prev) === 'down') score += 5;
  if ((vix.current ?? 20) > 25) score -= 10; else if ((vix.current ?? 20) < 15) score += 5;
  score = Math.max(5, Math.min(95, score));

  const regimeBorder: Record<string, string> = {
    green: 'border-green-600 bg-green-900/20',
    blue: 'border-blue-600 bg-blue-900/20',
    red: 'border-red-600 bg-red-900/20',
    orange: 'border-orange-600 bg-orange-900/20',
  };
  const regimeText: Record<string, string> = {
    green: 'text-green-400', blue: 'text-blue-400', red: 'text-red-400', orange: 'text-orange-400',
  };

  const sgdUsdDisplay = sgdUsd ? (1 / sgdUsd).toFixed(4) : '1.3350';

  const now = new Date();
  const fetchedLabel = `${now.toLocaleDateString('en-SG', { day: '2-digit', month: 'short' })} ${now.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false })} SGT`;

  const macroSignals = [
    {
      label: 'Fed Funds Rate',
      val: fedFunds,
      sparkVals: sparklineValues(fedFundsObs, 6),
      unit: '%', pos: false,
      explain: 'The US Federal Reserve\'s benchmark interest rate. High rates slow growth but curb inflation. Currently in a cutting cycle.',
    },
    {
      label: 'CPI Inflation (YoY)',
      val: cpiDisplay,
      sparkVals: [] as number[],
      unit: '%', pos: false,
      explain: 'US Consumer Price Index — year-over-year % change. Below 2% = Fed target. Falling trend is positive for markets.',
    },
    {
      label: 'GDP Growth',
      val: gdp,
      sparkVals: sparklineValues(gdpObs, 4),
      unit: '%', pos: true,
      explain: 'Annualised US GDP growth rate. Positive and rising = healthy economy. Quarterly data — lags by 1-2 quarters.',
    },
    {
      label: 'Unemployment',
      val: unemployment,
      sparkVals: sparklineValues(unemploymentObs, 6),
      unit: '%', pos: false,
      explain: 'US unemployment rate. Falling = strong labour market. Below 4% = full employment. Rising signals slowdown.',
    },
    {
      label: '10yr Treasury',
      val: treasury10y,
      sparkVals: sparklineValues(treasury10yObs, 6),
      unit: '%', pos: false,
      explain: 'Yield on US 10-year government bonds. Rising yields tighten global financial conditions, including SG credit markets.',
    },
    {
      label: 'VIX',
      val: vix,
      sparkVals: sparklineValues(vixObs, 6),
      unit: '', pos: false,
      explain: 'Market fear index. Below 15 = calm, 15-25 = normal, above 30 = panic. High VIX = client anxiety = more meetings.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Market Strip */}
      <div className="card mb-4 p-0 overflow-x-auto">
        <div className="flex min-w-max">
          <MarketStrip label="VIX" value={vix.current?.toFixed(2) ?? 'N/A'} color={(vix.current ?? 20) > 25 ? 'text-red-400' : 'text-green-400'} />
          {spy && <MarketStrip label="SPY" value={`$${spy.price.toFixed(2)}`} sub={spy.changePercent} />}
          {qqq && <MarketStrip label="QQQ" value={`$${qqq.price.toFixed(2)}`} sub={qqq.changePercent} />}
          {ews && <MarketStrip label="EWS (STI)" value={`$${ews.price.toFixed(2)}`} sub={ews.changePercent} />}
          <MarketStrip label="USD/SGD" value={sgdUsdDisplay} color="text-blue-300" />
          <MarketStrip label="SGD/USD" value={sgdUsd ? sgdUsd.toFixed(4) : '0.7490'} />
          <div className="market-strip-item flex-shrink-0 ml-auto">
            <span className="text-gray-600 text-xs">⏱ {fetchedLabel}</span>
          </div>
        </div>
      </div>

      {/* Singapore Focus */}
      <div className="mb-1">
        <h2 className="text-xs text-blue-400 uppercase tracking-widest font-semibold mb-3 flex items-center gap-1.5">
          🇸🇬 Singapore Focus
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card border border-blue-800/40 bg-blue-950/20">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">USD/SGD Rate</div>
          <div className="text-3xl font-bold font-mono text-blue-400">{sgdUsdDisplay}</div>
          <div className="text-xs text-gray-500 mt-1">1 USD = {sgdUsdDisplay} SGD</div>
          <div className="text-xs text-gray-600 mt-2 border-t border-gray-800 pt-2">Source: MAS · Hourly</div>
          <div className="text-xs text-gray-400 mt-2">
            {parseFloat(sgdUsdDisplay) > 1.35 ? '⚠️ SGD weak — imported inflation risk' : '✅ SGD firm — MAS appreciation holding'}
          </div>
        </div>

        <div className="card border border-blue-800/40 bg-blue-950/20">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">MAS Monetary Policy</div>
          <div className="text-xl font-bold text-blue-400 mb-1">Slight Appreciation</div>
          <div className="text-xs text-gray-400 mb-2">S$NEER Policy Band · Last Review Oct 2024</div>
          <div className="text-xs text-gray-500 border-t border-gray-800 pt-2">
            MAS uses SGD exchange rate as its primary lever. Slight appreciation bias gradually strengthens SGD — reducing imported inflation.
          </div>
        </div>

        <div className="card border border-blue-800/40 bg-blue-950/20">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">STI Proxy (EWS ETF)</div>
          {ews ? (
            <>
              <div className={`text-3xl font-bold font-mono ${parseFloat(ews.changePercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${ews.price.toFixed(2)}
              </div>
              <div className={`text-sm mt-1 ${parseFloat(ews.changePercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {parseFloat(ews.changePercent) >= 0 ? '+' : ''}{parseFloat(ews.changePercent).toFixed(2)}% today
              </div>
              <div className="text-xs text-gray-600 mt-2 border-t border-gray-800 pt-2">iShares MSCI Singapore ETF · US-listed proxy</div>
            </>
          ) : (
            <div className="text-gray-500 text-sm mt-2">Unavailable — Alpha Vantage rate limit. Check /singapore.</div>
          )}
          <div className="text-xs text-gray-400 mt-2">
            {regime === 'Recovery' || regime === 'Boom' ? '✅ Current regime favors SG equities.' : '⚠️ Defensive positioning preferred.'}
          </div>
        </div>
      </div>

      {/* Core Dashboard: Regime | Fear & Greed Gauge | Key Signals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

        {/* Regime */}
        <div className={`card border-2 ${regimeBorder[regimeColor]}`}>
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Market Regime</div>
          <div className={`text-3xl font-bold mb-1 ${regimeText[regimeColor]}`}>{regime}</div>
          <div className="text-xs text-gray-400 mb-3 border-b border-gray-800 pb-3">{regimeInfo.plain}</div>
          <div className="text-xs text-gray-500">
            <span className="text-gray-400 font-semibold">Implication: </span>
            {regime === 'Recovery' ? 'Risk-On. Equities and growth assets favored.' :
             regime === 'Boom' ? 'Late cycle. Commodities, TIPS, value equities.' :
             regime === 'Stagflation' ? 'Risk-Off. Commodities, gold, short duration.' :
             'Defensive. Quality stocks, dividend REITs, CPF-SA.'}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800">
            <div className="text-xs text-gray-600">GDP {gdpTrend === 'up' ? '↑' : gdpTrend === 'down' ? '↓' : '→'} · CPI {cpiTrend === 'up' ? '↑ Rising' : cpiTrend === 'down' ? '↓ Cooling' : '→ Flat'}</div>
          </div>
        </div>

        {/* Fear & Greed Gauge */}
        <div className="card flex flex-col items-center justify-center">
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-3 self-start">Market Sentiment</div>
          <FearGreedGauge score={score} />
        </div>

        {/* Key Signals */}
        <div className="card">
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">Key Signals</div>
          <div className="space-y-2.5">
            {macroSignals.map(({ label, val, unit, pos }) => {
              const t = trend(val.current, val.prev);
              const c = trendColor(t, pos);
              return (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{label}</span>
                  <span className={`text-sm font-mono font-medium text-${c}-400`}>
                    {val.current !== null ? `${val.current}${unit}` : 'N/A'} {trendArrow(t)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FA Talking Points */}
      <div className="card mb-6 border border-violet-800/40 bg-violet-950/10">
        <div className="text-xs text-violet-400 uppercase tracking-widest mb-4 font-semibold flex items-center gap-2">
          ⚡ FA Talking Points — <span className={regimeText[regimeColor]}>{regime} Regime</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs flex-shrink-0">1</span>
              Opening with a new prospect
            </div>
            <p className="text-xs text-gray-400 leading-relaxed italic">{talkingPoints.newProspect}</p>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 font-bold text-xs flex-shrink-0">2</span>
              Existing client check-in
            </div>
            <p className="text-xs text-gray-400 leading-relaxed italic">{talkingPoints.existingClient}</p>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-xs flex-shrink-0">3</span>
              Pre-empt this objection
            </div>
            <p className="text-xs text-gray-400 leading-relaxed italic">{talkingPoints.objection}</p>
          </div>
        </div>
      </div>

      {/* SG Investor Context */}
      <div className="card mb-6 border border-blue-900/50 bg-blue-950/10">
        <div className="text-xs text-blue-400 uppercase tracking-widest mb-3 font-semibold">
          🇸🇬 What This Means for Singapore Investors
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-200 mb-1">Market Context</div>
            <p className="text-xs text-gray-400">{regimeInfo.sgMeaning}</p>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-200 mb-1">CPF vs ILP Consideration</div>
            <p className="text-xs text-gray-400">{regimeInfo.cpfNote}</p>
          </div>
        </div>
      </div>

      {/* Signal Breakdown with Sparklines */}
      <div className="card mb-6">
        <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">Signal Breakdown</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {macroSignals.map(({ label, val, sparkVals, unit, pos, explain }) => {
            const t = trend(val.current, val.prev);
            const c = trendColor(t, pos);
            return (
              <div key={label} className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-gray-300">{label}</span>
                  <div className="flex items-center gap-2">
                    {sparkVals.length >= 2 && <Sparkline values={sparkVals} positive={pos} />}
                    <span className={`text-sm font-mono text-${c}-400`}>
                      {val.current !== null ? `${val.current}${unit}` : 'N/A'} {trendArrow(t)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{explain}</p>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-gray-700 mt-3 pt-3 border-t border-gray-800">
          ⏱ Data refreshed: {fetchedLabel} · Source: FRED (fallback), MAS, MarketAux, Alpha Vantage
        </div>
      </div>

      {/* Top Headlines */}
      <h2 className="text-sm text-gray-400 uppercase tracking-widest mb-3">Top Headlines</h2>
      <div className="space-y-3">
        {news.length > 0 ? news.map((article, i) => (
          <a key={i} href={article.url} target="_blank" rel="noopener noreferrer" className="card block hover:border-gray-600 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-100 line-clamp-2">{article.title}</div>
                {article.description && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                    {article.description.slice(0, 120)}{article.description.length > 120 ? '...' : ''}
                  </div>
                )}
                <div className="text-xs text-gray-600 mt-1">{article.source} · {new Date(article.publishedAt).toLocaleDateString('en-SG')}</div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                {article.symbol && <span className="text-xs text-blue-400 font-mono">{article.symbol}</span>}
                <SentimentBadge score={article.sentiment} />
              </div>
            </div>
          </a>
        )) : (
          <div className="card text-gray-500 text-sm">Headlines loading — visit /news for full feed.</div>
        )}
      </div>
      <div className="text-xs text-gray-700 text-center mt-6">
        RISUN · Research Only · Not Financial Advice · Data: FRED, MarketAux, Alpha Vantage, MAS
      </div>
    </div>
  );
}
