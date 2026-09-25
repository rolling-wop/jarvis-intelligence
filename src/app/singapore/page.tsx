export const dynamic = 'force-dynamic';
import { ALPHA_VANTAGE_KEY } from '@/lib/api';

interface SgStock {
  ticker: string;
  name: string;
  sector: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  isLive: boolean;
  fallbackPrice: number;
}

async function fetchSgStock(ticker: string, fallback: number): Promise<{ price: number | null; change: number | null; changePct: number | null; isLive: boolean }> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_KEY}`;
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 3600 } } as RequestInit);
    const data = await res.json();
    const q = data['Global Quote'];
    if (!q || !q['05. price'] || parseFloat(q['05. price']) === 0) {
      return { price: fallback, change: null, changePct: null, isLive: false };
    }
    return {
      price: parseFloat(q['05. price']),
      change: parseFloat(q['09. change']),
      changePct: parseFloat(q['10. change percent']?.replace('%', '') ?? '0'),
      isLive: true,
    };
  } catch {
    return { price: fallback, change: null, changePct: null, isLive: false };
  }
}

async function getSgdUsd(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://api.mas.gov.sg/api/action/datastore/search.json?resource_id=95932927-c8bc-4e7a-b484-68a66a24edfe&limit=1',
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const records = data?.result?.records;
    if (records?.[0]) {
      const rec = records[0];
      const keys = Object.keys(rec).filter((k: string) => k !== '_id' && k !== 'end_of_day');
      const key = keys.find((k: string) => k.includes('usd_sgd') || k.includes('sgd_usd') || k.toLowerCase().includes('usd'));
      if (key) return parseFloat(rec[key]);
    }
    return null;
  } catch { return null; }
}

// Fallback prices (SGD) — updated Sep 2026. Used when Alpha Vantage rate-limits.
const SG_STOCK_LIST = [
  { ticker: 'D05.SI', name: 'DBS Group', sector: 'Banking', fallback: 40.20 },
  { ticker: 'O39.SI', name: 'OCBC Bank', sector: 'Banking', fallback: 16.80 },
  { ticker: 'U11.SI', name: 'UOB', sector: 'Banking', fallback: 34.50 },
  { ticker: 'Z74.SI', name: 'SingTel', sector: 'Telecom', fallback: 3.10 },
  { ticker: 'C6L.SI', name: 'Singapore Airlines', sector: 'Aviation', fallback: 7.20 },
];

const masPolicy = {
  stance: 'Slight Appreciation',
  band: 'S$NEER Policy Band',
  lastReview: 'October 2024',
  outlook: 'MAS maintains slightly appreciating SGD NEER policy. Core inflation easing toward target. Policy expected to remain unchanged in near term.',
  coreInflation: '2.8%',
  gdpGrowth: '2.1%',
};

export default async function SingaporePage() {
  // Fetch SGD rate + SG stocks in parallel (rate-limit aware: 1hr cache per stock)
  const [sgdUsd, ...stockResults] = await Promise.all([
    getSgdUsd(),
    ...SG_STOCK_LIST.map(s => fetchSgStock(s.ticker, s.fallback)),
  ]);

  const sgStocks: SgStock[] = SG_STOCK_LIST.map((s, i) => ({
    ticker: s.ticker,
    name: s.name,
    sector: s.sector,
    fallbackPrice: s.fallback,
    price: stockResults[i].price,
    change: stockResults[i].change,
    changePct: stockResults[i].changePct,
    isLive: stockResults[i].isLive,
  }));

  const usdSgd = sgdUsd ? (1 / sgdUsd).toFixed(4) : '1.3350'; // fallback

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Singapore Pulse</h1>
        <p className="text-gray-500 text-sm mt-1">SGD rates · MAS policy · Key SG equities</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* SGD/USD Rate */}
        <div className="card">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">SGD/USD Rate</div>
          <div className="text-4xl font-bold font-mono text-blue-400">
            {sgdUsd ? sgdUsd.toFixed(4) : usdSgd}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {sgdUsd ? 'SGD per 1 USD' : '1 USD = SGD (fallback)'}
          </div>
          <div className="text-xs text-gray-600 mt-2">Source: Monetary Authority of Singapore</div>
        </div>

        {/* MAS Policy Stance */}
        <div className="card border-blue-800/50">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">MAS Policy Stance</div>
          <div className="text-xl font-bold text-blue-400 mb-1">{masPolicy.stance}</div>
          <div className="text-xs text-gray-400">{masPolicy.band}</div>
          <div className="text-xs text-gray-500 mt-2">Last Review: {masPolicy.lastReview}</div>
          <div className="text-xs text-gray-400 mt-2 border-t border-gray-800 pt-2">
            {masPolicy.outlook}
          </div>
        </div>

        {/* SG Economic Context */}
        <div className="card">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">SG Economic Context</div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Core Inflation</span>
              <span className="text-sm font-mono text-yellow-400">{masPolicy.coreInflation} ↓</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">GDP Growth</span>
              <span className="text-sm font-mono text-green-400">{masPolicy.gdpGrowth} ↑</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Policy Outlook</span>
              <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">On Hold</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">STI Outlook</span>
              <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded">Constructive</span>
            </div>
          </div>
        </div>
      </div>

      {/* SG Key Stocks */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-gray-300 uppercase tracking-widest">
            Key SG Stocks
          </div>
          <div className="text-xs text-gray-600">Via Alpha Vantage · 1hr cache</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                <th className="text-left py-2 pr-4">Ticker</th>
                <th className="text-left py-2 pr-4">Name</th>
                <th className="text-left py-2 pr-4">Sector</th>
                <th className="text-right py-2 pr-4">Price (SGD)</th>
                <th className="text-right py-2 pr-4">Change</th>
                <th className="text-right py-2">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {sgStocks.map((stock) => {
                const isUp = (stock.changePct ?? 0) >= 0;
                return (
                  <tr key={stock.ticker} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-blue-400">{stock.ticker}</td>
                    <td className="py-2.5 pr-4 text-gray-200">{stock.name}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{stock.sector}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-white">
                      S${stock.price !== null ? stock.price.toFixed(2) : 'N/A'}
                    </td>
                    <td className={`py-2.5 pr-4 text-right font-mono ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                      {stock.changePct !== null
                        ? `${isUp ? '+' : ''}${stock.changePct.toFixed(2)}%`
                        : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-2.5 text-right">
                      {stock.isLive
                        ? <span className="text-xs text-green-400 bg-green-900/20 border border-green-800/40 px-1.5 py-0.5 rounded">Live</span>
                        : <span className="text-xs text-gray-600 bg-gray-800/40 border border-gray-700/40 px-1.5 py-0.5 rounded">Fallback</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-600 mt-3">
          Live = Alpha Vantage real-time. Fallback = last known prices (Sep 2026) — shown when API rate limit hit.
        </div>
      </div>

      {/* CPF Rates Table */}
      <div className="card mb-4">
        <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">CPF Interest Rates (2026)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">Account</th>
                <th className="text-right py-2 pr-4 text-gray-500 font-medium">Rate p.a.</th>
                <th className="text-right py-2 pr-4 text-gray-500 font-medium">Extra (first $60k)</th>
                <th className="text-left py-2 text-gray-500 font-medium">Use</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {[
                { acct: 'Ordinary Account (OA)', rate: '2.5%', extra: '+1.0%', use: 'Housing, investments, insurance' },
                { acct: 'Special Account (SA)', rate: '4.0%', extra: '+1.0%', use: 'Retirement — locked until 55' },
                { acct: 'MediSave Account (MA)', rate: '4.0%', extra: '+1.0%', use: 'Hospitalisation, healthcare' },
                { acct: 'Retirement Account (RA)', rate: '4.0%', extra: '+2.0%', use: 'CPF LIFE payouts from 65' },
              ].map(r => (
                <tr key={r.acct} className="hover:bg-gray-900/30">
                  <td className="py-2 pr-4 text-gray-300 font-medium">{r.acct}</td>
                  <td className="py-2 pr-4 text-right text-green-400 font-mono font-bold">{r.rate}</td>
                  <td className="py-2 pr-4 text-right text-blue-400 font-mono">{r.extra}</td>
                  <td className="py-2 text-gray-500">{r.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 p-2 bg-blue-950/30 rounded-lg border border-blue-900/50 text-xs text-blue-300">
          💡 Advisor note: CPF-OA at 2.5% is the primary competitor to ILP investments. In a Recovery regime, a diversified ILP equity allocation historically outperforms CPF-OA by 3–7% p.a.
        </div>
      </div>

      {/* SRS Tax Savings Calculator */}
      <div className="card mb-4">
        <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">SRS Tax Savings Estimator</div>
        <p className="text-xs text-gray-500 mb-3">SRS contribution limit: $15,300/yr (Singapore Citizens &amp; PRs) · $35,700/yr (Foreigners). Tax saved = contribution × marginal tax rate.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">Chargeable Income</th>
                <th className="text-right py-2 pr-4 text-gray-500 font-medium">Tax Rate</th>
                <th className="text-right py-2 pr-4 text-gray-500 font-medium">Tax Saved (max SRS)</th>
                <th className="text-right py-2 text-gray-500 font-medium">Effective After-Tax Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {[
                { income: '$40,001 – $80,000', rate: '11.5%', saved: '$1,760', net: '$13,540' },
                { income: '$80,001 – $120,000', rate: '15%', saved: '$2,295', net: '$13,005' },
                { income: '$120,001 – $160,000', rate: '18%', saved: '$2,754', net: '$12,546' },
                { income: '$160,001 – $200,000', rate: '19%', saved: '$2,907', net: '$12,393' },
                { income: '$200,001 – $240,000', rate: '19.5%', saved: '$2,984', net: '$12,316' },
                { income: '$240,001 – $280,000', rate: '20%', saved: '$3,060', net: '$12,240' },
                { income: '>$1,000,000', rate: '24%', saved: '$3,672', net: '$11,628' },
              ].map(r => (
                <tr key={r.income} className="hover:bg-gray-900/30">
                  <td className="py-2 pr-4 text-gray-300">{r.income}</td>
                  <td className="py-2 pr-4 text-right text-yellow-400 font-mono">{r.rate}</td>
                  <td className="py-2 pr-4 text-right text-green-400 font-mono font-bold">{r.saved}</td>
                  <td className="py-2 text-right text-blue-400 font-mono">{r.net}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 p-2 bg-green-950/30 rounded-lg border border-green-900/50 text-xs text-green-300">
          💡 SRS funds can be used to purchase ILP premiums — effectively getting a tax deduction on your investment. Powerful closing angle for high-income clients.
        </div>
      </div>

      {/* Advisor Context */}
      <div className="card bg-blue-950/30 border-blue-800/50">
        <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">Advisor Context</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
          <div>
            <div className="font-semibold text-gray-200 mb-1">SGD Strength Implication</div>
            <p className="text-gray-400">Strong SGD reduces imported inflation but pressures Singapore exporters. MAS uses SGD as primary policy tool — watch S$NEER band adjustments.</p>
          </div>
          <div>
            <div className="font-semibold text-gray-200 mb-1">Key Client Talking Points</div>
            <ul className="text-gray-400 space-y-1">
              <li>• SG remains investment-grade, AAA sovereign</li>
              <li>• CPF SA rate: 4.08% p.a. (competitive floor)</li>
              <li>• DBS/OCBC/UOB — regional banking exposure</li>
              <li>• STI dividend yield ~3.5% historically attractive</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
