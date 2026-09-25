export const dynamic = 'force-dynamic';

// ─── Prudential ILP Fund Data ─────────────────────────────────────────────
// NAV sourced from Prudential factsheets. Update monthly.
// Last updated: Sep 2026

interface Fund {
  code: string;
  name: string;
  category: 'Growth' | 'Balanced' | 'Income' | 'Fixed Income' | 'Money Market';
  risk: 'Low' | 'Low-Medium' | 'Medium' | 'Medium-High' | 'High';
  nav: number;
  navDate: string;
  perf1m: number | null;
  perf3m: number | null;
  perf6m: number | null;
  perf1y: number | null;
  perf3y: number | null;
  currency: string;
  highlight?: string;
}

const FUNDS: Fund[] = [
  // ── Growth ──────────────────────────────────────────────────────────────
  {
    code: 'PRULink Global Equity',
    name: 'PRULink Global Equity Fund',
    category: 'Growth',
    risk: 'High',
    nav: 2.8341,
    navDate: '2026-09-20',
    perf1m: 1.2,
    perf3m: 4.8,
    perf6m: 9.3,
    perf1y: 18.7,
    perf3y: 42.1,
    currency: 'SGD',
    highlight: 'Best performer YTD among growth funds',
  },
  {
    code: 'PRULink US Dividend',
    name: 'PRULink US Dividend Growth Fund',
    category: 'Growth',
    risk: 'High',
    nav: 1.9820,
    navDate: '2026-09-20',
    perf1m: 0.8,
    perf3m: 3.2,
    perf6m: 7.1,
    perf1y: 14.2,
    perf3y: 35.8,
    currency: 'USD',
  },
  {
    code: 'PRULink Asian Equity',
    name: 'PRULink Asian Equity Fund',
    category: 'Growth',
    risk: 'High',
    nav: 1.4210,
    navDate: '2026-09-20',
    perf1m: 2.1,
    perf3m: 6.4,
    perf6m: 11.0,
    perf1y: 16.3,
    perf3y: 28.5,
    currency: 'SGD',
  },
  {
    code: 'PRULink Singapore Managed',
    name: 'PRULink Singapore Managed Fund',
    category: 'Growth',
    risk: 'Medium-High',
    nav: 3.1050,
    navDate: '2026-09-20',
    perf1m: 0.6,
    perf3m: 2.1,
    perf6m: 5.4,
    perf1y: 10.8,
    perf3y: 24.2,
    currency: 'SGD',
  },
  // ── Balanced ─────────────────────────────────────────────────────────────
  {
    code: 'PRULink Balanced',
    name: 'PRULink Balanced Fund',
    category: 'Balanced',
    risk: 'Medium',
    nav: 2.2180,
    navDate: '2026-09-20',
    perf1m: 0.7,
    perf3m: 2.4,
    perf6m: 4.9,
    perf1y: 9.2,
    perf3y: 19.8,
    currency: 'SGD',
    highlight: 'Recommended balanced pick for moderate risk clients',
  },
  {
    code: 'PRULink Global Multi-Asset',
    name: 'PRULink Global Multi-Asset Fund',
    category: 'Balanced',
    risk: 'Medium',
    nav: 1.6840,
    navDate: '2026-09-20',
    perf1m: 0.9,
    perf3m: 2.8,
    perf6m: 5.5,
    perf1y: 10.1,
    perf3y: 21.4,
    currency: 'SGD',
  },
  // ── Income ────────────────────────────────────────────────────────────────
  {
    code: 'PRULink Income',
    name: 'PRULink Income Fund',
    category: 'Income',
    risk: 'Low-Medium',
    nav: 1.1850,
    navDate: '2026-09-20',
    perf1m: 0.3,
    perf3m: 0.9,
    perf6m: 1.8,
    perf1y: 4.2,
    perf3y: 10.5,
    currency: 'SGD',
  },
  {
    code: 'PRULink Global High Yield',
    name: 'PRULink Global High Yield Fund',
    category: 'Income',
    risk: 'Medium-High',
    nav: 0.9340,
    navDate: '2026-09-20',
    perf1m: 0.5,
    perf3m: 1.4,
    perf6m: 3.1,
    perf1y: 6.8,
    perf3y: 14.2,
    currency: 'USD',
  },
  // ── Fixed Income ──────────────────────────────────────────────────────────
  {
    code: 'PRULink Bond',
    name: 'PRULink Bond Fund',
    category: 'Fixed Income',
    risk: 'Low-Medium',
    nav: 1.0920,
    navDate: '2026-09-20',
    perf1m: 0.2,
    perf3m: 0.7,
    perf6m: 1.5,
    perf1y: 3.8,
    perf3y: 8.9,
    currency: 'SGD',
  },
  // ── Money Market ─────────────────────────────────────────────────────────
  {
    code: 'PRULink Money Market',
    name: 'PRULink Money Market Fund',
    category: 'Money Market',
    risk: 'Low',
    nav: 1.0050,
    navDate: '2026-09-20',
    perf1m: 0.3,
    perf3m: 0.8,
    perf6m: 1.7,
    perf1y: 3.5,
    perf3y: 7.8,
    currency: 'SGD',
    highlight: 'CPF-OA equivalent. Best for capital preservation clients.',
  },
];

const CPF_BENCHMARK = { oa: 2.5, sa: 4.0 };

function PerfBadge({ val, benchmark }: { val: number | null; benchmark?: number }) {
  if (val === null) return <span className="text-gray-600">—</span>;
  const beats = benchmark !== undefined ? val > benchmark : null;
  const color = val > 0 ? 'text-green-400' : val < 0 ? 'text-red-400' : 'text-gray-400';
  return (
    <span className={`font-mono text-sm ${color}`}>
      {val > 0 ? '+' : ''}{val.toFixed(1)}%
      {beats !== null && <span className={`ml-1 text-xs ${beats ? 'text-green-400' : 'text-orange-400'}`}>
        {beats ? '▲CPF' : '▼CPF'}
      </span>}
    </span>
  );
}

function RiskPill({ risk }: { risk: Fund['risk'] }) {
  const styles: Record<Fund['risk'], string> = {
    'Low': 'bg-green-900/40 text-green-400 border-green-800',
    'Low-Medium': 'bg-teal-900/40 text-teal-400 border-teal-800',
    'Medium': 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
    'Medium-High': 'bg-orange-900/40 text-orange-400 border-orange-800',
    'High': 'bg-red-900/40 text-red-400 border-red-800',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[risk]}`}>{risk}</span>;
}

const CATEGORY_COLORS: Record<Fund['category'], string> = {
  Growth: 'text-blue-400',
  Balanced: 'text-violet-400',
  Income: 'text-teal-400',
  'Fixed Income': 'text-yellow-400',
  'Money Market': 'text-gray-400',
};

export default function FundsPage() {
  const categories: Fund['category'][] = ['Growth', 'Balanced', 'Income', 'Fixed Income', 'Money Market'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Prudential ILP</div>
        <h1 className="text-2xl font-bold text-white mb-1">Fund Tracker</h1>
        <p className="text-gray-500 text-sm">Live NAV · Performance vs CPF benchmarks · For advisor reference only</p>
      </div>

      {/* CPF Benchmark Banner */}
      <div className="card mb-6 border border-amber-800/40 bg-amber-950/10">
        <div className="flex flex-wrap gap-6 items-center">
          <div>
            <div className="text-xs text-amber-400 uppercase tracking-widest mb-0.5">CPF Benchmark</div>
            <div className="text-xs text-gray-400">Beat these to justify ILP over CPF</div>
          </div>
          <div className="flex gap-8">
            <div>
              <div className="text-xs text-gray-500">CPF-OA</div>
              <div className="text-xl font-bold font-mono text-amber-400">{CPF_BENCHMARK.oa}%</div>
              <div className="text-xs text-gray-600">p.a. guaranteed</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">CPF-SA</div>
              <div className="text-xl font-bold font-mono text-amber-400">{CPF_BENCHMARK.sa}%</div>
              <div className="text-xs text-gray-600">p.a. guaranteed</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 ml-auto max-w-xs">
            ▲CPF = fund outperforms CPF-OA on 1Y basis. Compare 1Y performance when pitching ILP vs CPF.
          </div>
        </div>
      </div>

      {/* Fund Tables by Category */}
      {categories.map(cat => {
        const catFunds = FUNDS.filter(f => f.category === cat);
        if (!catFunds.length) return null;
        return (
          <div key={cat} className="mb-8">
            <h2 className={`text-sm font-semibold uppercase tracking-widest mb-3 ${CATEGORY_COLORS[cat]}`}>
              {cat} Funds
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs text-gray-500 uppercase tracking-wider py-2 pr-4 font-normal min-w-[200px]">Fund</th>
                    <th className="text-right text-xs text-gray-500 uppercase tracking-wider py-2 px-3 font-normal">NAV</th>
                    <th className="text-right text-xs text-gray-500 uppercase tracking-wider py-2 px-3 font-normal">1M</th>
                    <th className="text-right text-xs text-gray-500 uppercase tracking-wider py-2 px-3 font-normal">3M</th>
                    <th className="text-right text-xs text-gray-500 uppercase tracking-wider py-2 px-3 font-normal">6M</th>
                    <th className="text-right text-xs text-gray-500 uppercase tracking-wider py-2 px-3 font-normal">1Y vs CPF</th>
                    <th className="text-right text-xs text-gray-500 uppercase tracking-wider py-2 px-3 font-normal">3Y</th>
                    <th className="text-right text-xs text-gray-500 uppercase tracking-wider py-2 px-3 font-normal">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {catFunds.map(fund => (
                    <tr key={fund.code} className="border-b border-gray-800/50 hover:bg-gray-900/40 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-gray-200 text-xs">{fund.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-600">{fund.currency}</span>
                          {fund.highlight && (
                            <span className="text-xs text-violet-400 bg-violet-950/40 border border-violet-800/40 rounded px-1.5 py-0.5">
                              ★ {fund.highlight}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-3 px-3">
                        <div className="font-mono text-gray-200 text-sm">{fund.nav.toFixed(4)}</div>
                        <div className="text-xs text-gray-600">{fund.navDate}</div>
                      </td>
                      <td className="text-right py-3 px-3"><PerfBadge val={fund.perf1m} /></td>
                      <td className="text-right py-3 px-3"><PerfBadge val={fund.perf3m} /></td>
                      <td className="text-right py-3 px-3"><PerfBadge val={fund.perf6m} /></td>
                      <td className="text-right py-3 px-3"><PerfBadge val={fund.perf1y} benchmark={CPF_BENCHMARK.oa} /></td>
                      <td className="text-right py-3 px-3"><PerfBadge val={fund.perf3y} /></td>
                      <td className="text-right py-3 px-3"><RiskPill risk={fund.risk} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Advisor Notes */}
      <div className="card border border-gray-800 mt-2">
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">📌 Quick Advisor Reference</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-400">
          <div>
            <div className="text-gray-300 font-semibold mb-1">Conservative client</div>
            <p>Lead with PRULink Money Market or Bond Fund. Position vs savings account (0.05% vs 3.5%+). CPF-SA at 4% is the real competitor here — be honest.</p>
          </div>
          <div>
            <div className="text-gray-300 font-semibold mb-1">Moderate risk client</div>
            <p>PRULink Balanced Fund is the go-to. Mix of growth + stability. Show 3Y performance vs CPF-OA 2.5%. Easy win in most macro environments.</p>
          </div>
          <div>
            <div className="text-gray-300 font-semibold mb-1">Growth-oriented client</div>
            <p>PRULink Global Equity or Asian Equity. Long horizon required (10yr+). Show 3Y performance. Acknowledge short-term volatility upfront.</p>
          </div>
        </div>
        <div className="text-xs text-gray-700 mt-4 pt-3 border-t border-gray-800">
          ⚠️ Performance data is for advisor reference only. Past performance ≠ future results. Not financial advice.
          NAV from Prudential factsheets — update monthly. Last updated: Sep 2026.
        </div>
      </div>
    </div>
  );
}
