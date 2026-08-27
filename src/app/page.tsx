import { fetchFred, latestFred, trend, trendArrow, trendColor, MARKETAUX_API_KEY, ALPHA_VANTAGE_KEY } from '@/lib/api';

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

const REGIME_EXPLANATIONS: Record<string, { plain: string; sgMeaning: string; cpfNote: string }> = {
  Recovery: {
    plain: 'The economy is growing and inflation is under control — the sweet spot for markets. Risk assets like equities tend to perform well.',
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
  Recession: {
    plain: 'Economic contraction with falling prices. Central banks cut rates to stimulate growth. Bonds, quality stocks, and cash outperform.',
    sgMeaning: 'Singapore as a trade hub feels global slowdowns sharply. MAS may loosen monetary policy. Defensive posture is prudent.',
    cpfNote: 'CPF guaranteed returns shine vs market losses. Position CPF-SA at 4% as a safe anchor for clients.',
  },
};

export default async function Dashboard() {
  const [fedFundsObs, cpiObs, gdpObs, unemploymentObs, treasury10yObs, vixObs,
    spy, qqq, ews, sgdUsd, news] = await Promise.all([
    fetchFred('FEDFUNDS', 3),
    fetchFred('CPIAUCSL', 3),
    fetchFred('A191RL1Q225SBEA', 3),
    fetchFred('UNRATE', 3),
    fetchFred('GS10', 3),
    fetchFred('VIXCLS', 2),
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

  const gdpTrend = trend(gdp.current, gdp.prev);
  const cpiTrend = trend(cpi.current, cpi.prev);

  // Regime
  let regime = 'Recovery', regimeColor = 'green';
  if (gdpTrend === 'up' && cpiTrend === 'down') {
    regime = 'Recovery'; regimeColor = 'green';
  } else if (gdpTrend === 'up') {
    regime = 'Boom'; regimeColor = 'blue';
  } else if (cpiTrend === 'up') {
    regime = 'Stagflation'; regimeColor = 'red';
  } else {
    regime = 'Recession'; regimeColor = 'orange';
  }

  const regimeInfo = REGIME_EXPLANATIONS[regime] || REGIME_EXPLANATIONS['Recovery'];

  // Score
  let score = 50;
  if (gdpTrend === 'up') score += 10; if (gdpTrend === 'down') score -= 10;
  if (cpiTrend === 'down') score += 10; if (cpiTrend === 'up') score -= 10;
  if (trend(unemployment.current, unemployment.prev) === 'down') score += 5;
  if (trend(unemployment.current, unemployment.prev) === 'up') score -= 5;
  if (trend(treasury10y.current, treasury10y.prev) === 'up') score -= 5;
  if (trend(treasury10y.current, treasury10y.prev) === 'down') score += 5;
  score = Math.max(0, Math.min(100, score));
  const signalLabel = score >= 60 ? 'Risk-On' : score >= 40 ? 'Neutral' : 'Risk-Off';
  const signalColor = score >= 60 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400';

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

  const macroSignals = [
    {
      label: 'Fed Funds Rate', val: fedFunds, unit: '%', pos: false,
      explain: 'The US Federal Reserve\'s benchmark interest rate. When it\'s high, borrowing is expensive and growth slows — but it also curbs inflation.',
    },
    {
      label: 'CPI Inflation', val: cpi, unit: '%', pos: false,
      explain: 'Measures how fast prices are rising in the US. Lower is better for purchasing power and for market multiples.',
    },
    {
      label: 'GDP Growth', val: gdp, unit: '%', pos: true,
      explain: 'The pace of US economic expansion. Positive and rising means the economy is healthy and corporate earnings are likely growing.',
    },
    {
      label: 'Unemployment', val: unemployment, unit: '%', pos: false,
      explain: 'The share of Americans without jobs. Falling unemployment signals a strong labour market and consumer spending power.',
    },
    {
      label: '10yr Treasury', val: treasury10y, unit: '%', pos: false,
      explain: 'The yield on 10-year US government bonds. Rising yields tighten financial conditions globally, including Singapore credit markets.',
    },
    {
      label: 'VIX', val: vix, unit: '', pos: false,
      explain: 'Market fear index. Below 20 = calm; above 30 = panic. High VIX often means equity volatility and client anxiety.',
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
        </div>
      </div>

      {/* Singapore-First Section */}
      <div className="mb-1">
        <h2 className="text-xs text-blue-400 uppercase tracking-widest font-semibold mb-3 flex items-center gap-1.5">
          🇸🇬 Singapore Focus
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* SGD/USD */}
        <div className="card border border-blue-800/40 bg-blue-950/20">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">USD/SGD Rate</div>
          <div className="text-3xl font-bold font-mono text-blue-400">{sgdUsdDisplay}</div>
          <div className="text-xs text-gray-500 mt-1">1 USD = {sgdUsdDisplay} SGD</div>
          <div className="text-xs text-gray-600 mt-2 border-t border-gray-800 pt-2">
            Source: Monetary Authority of Singapore · Hourly
          </div>
          <div className="text-xs text-gray-400 mt-2">
            {parseFloat(sgdUsdDisplay) > 1.35
              ? '⚠️ SGD relatively weak — imported inflation risk'
              : '✅ SGD firm — MAS appreciation stance holding'}
          </div>
        </div>

        {/* MAS Policy */}
        <div className="card border border-blue-800/40 bg-blue-950/20">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">MAS Monetary Policy</div>
          <div className="text-xl font-bold text-blue-400 mb-1">Slight Appreciation</div>
          <div className="text-xs text-gray-400 mb-2">S$NEER Policy Band · Last Review Oct 2024</div>
          <div className="text-xs text-gray-500 border-t border-gray-800 pt-2">
            MAS uses the SGD exchange rate (not interest rates) as its main policy lever. A slight appreciation bias means the SGD is allowed to gradually strengthen — reducing imported inflation.
          </div>
        </div>

        {/* STI via EWS */}
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
              <div className="text-xs text-gray-600 mt-2 border-t border-gray-800 pt-2">
                iShares MSCI Singapore ETF · US-listed SGX proxy
              </div>
            </>
          ) : (
            <>
              <div className="text-gray-500 text-sm">Data unavailable</div>
              <div className="text-xs text-gray-600 mt-1">Alpha Vantage rate limit — check /singapore</div>
            </>
          )}
          <div className="text-xs text-gray-400 mt-2">
            STI historically yields ~3.5%. {regime === 'Recovery' || regime === 'Boom' ? '✅ Current regime favors SG equities.' : '⚠️ Defensive positioning preferred.'}
          </div>
        </div>
      </div>

      {/* Main Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Regime */}
        <div className={`card border-2 ${regimeBorder[regimeColor]}`}>
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Market Regime</div>
          <div className={`text-3xl font-bold mb-1 ${regimeText[regimeColor]}`}>{regime}</div>
          <div className="text-xs text-gray-400 mb-3 border-b border-gray-800 pb-3">{regimeInfo.plain}</div>
          <div className="text-xs text-gray-500">
            <span className="text-gray-400 font-semibold">Portfolio implication: </span>
            {regime === 'Recovery' ? 'Risk-On. Equities, growth assets favored.' :
             regime === 'Boom' ? 'Late cycle. Commodities, TIPS, value equities.' :
             regime === 'Stagflation' ? 'Risk-Off. Commodities, gold, short duration.' :
             'Defensive. Bonds, quality equities, cash.'}
          </div>
        </div>

        {/* Signal Score */}
        <div className="card">
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Composite Signal</div>
          <div className={`text-5xl font-bold font-mono mb-1 ${signalColor}`}>{score}</div>
          <div className={`text-sm font-semibold ${signalColor} mb-3`}>{signalLabel}</div>
          <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
            <div className={`h-2 rounded-full ${score >= 60 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${score}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mb-3"><span>0 = Risk-Off</span><span>100 = Risk-On</span></div>
          <div className="text-xs text-gray-500 border-t border-gray-800 pt-2">
            Combines GDP, CPI, unemployment, and yield trends. Above 60 favors growth assets; below 40 suggests defensive positioning.
          </div>
        </div>

        {/* Macro Snapshot with explanations */}
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

      {/* What this means for SG investors */}
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

      {/* Signal Explanations */}
      <div className="card mb-6">
        <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">Signal Breakdown</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {macroSignals.map(({ label, val, unit, pos, explain }) => {
            const t = trend(val.current, val.prev);
            const c = trendColor(t, pos);
            return (
              <div key={label} className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-semibold text-gray-300">{label}</span>
                  <span className={`text-sm font-mono text-${c}-400`}>
                    {val.current !== null ? `${val.current}${unit}` : 'N/A'} {trendArrow(t)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{explain}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top News — 5 headlines */}
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
          <div className="card text-gray-500 text-sm">News loading or unavailable — visit /news for full feed.</div>
        )}
      </div>
      <div className="text-xs text-gray-700 text-center mt-6">
        RISUN · Research Only · Not Financial Advice · Data from FRED, MarketAux, Alpha Vantage, MAS
      </div>
    </div>
  );
}
