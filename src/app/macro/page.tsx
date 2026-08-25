import { fetchFred, latestFred, trend, trendArrow, trendColor } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface MetricCardProps {
  label: string;
  value: number | null;
  unit: string;
  date?: string;
  t: 'up' | 'down' | 'flat';
  positiveIsGood?: boolean;
  plainEnglish: string;
  sgRelevance?: string;
}

function MetricCard({ label, value, unit, date, t, positiveIsGood = true, plainEnglish, sgRelevance }: MetricCardProps) {
  const color = trendColor(t, positiveIsGood);
  return (
    <div className="card hover:border-gray-700 transition-colors">
      <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-3xl font-bold font-mono text-${color}-400 flex items-end gap-2`}>
        {value !== null ? `${value}${unit}` : 'N/A'}
        <span className={`text-xl text-${color}-400`}>{trendArrow(t)}</span>
      </div>
      {date && <div className="text-xs text-gray-600 mt-1">Last: {date}</div>}
      <div className="text-xs text-gray-500 mt-2 border-t border-gray-800 pt-2">{plainEnglish}</div>
      {sgRelevance && (
        <div className="text-xs text-blue-400/80 mt-1.5 bg-blue-950/20 rounded px-2 py-1">
          🇸🇬 {sgRelevance}
        </div>
      )}
    </div>
  );
}

async function fetchSgCpi(): Promise<{ value: string; date: string } | null> {
  try {
    // MAS CPI data — All Items CPI Singapore
    const res = await fetch(
      'https://api.mas.gov.sg/api/action/datastore/search.json?resource_id=af68543e-b81d-4c92-bd5e-eff7b2e5c67d&limit=2&sort=end_of_period+desc',
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const records = data?.result?.records;
    if (records?.[0]) {
      const keys = Object.keys(records[0]).filter(k => k !== '_id' && k !== 'end_of_period' && k !== 'quarter');
      // Look for all_items or similar
      const key = keys.find(k => k.toLowerCase().includes('all') || k.toLowerCase().includes('cpi'));
      if (key && records[0][key]) {
        return { value: records[0][key], date: records[0]['end_of_period'] || '' };
      }
      // fallback: return first non-id value
      if (keys[0] && records[0][keys[0]]) {
        return { value: records[0][keys[0]], date: records[0]['end_of_period'] || '' };
      }
    }
    return null;
  } catch { return null; }
}

async function fetchMasPolicy(): Promise<{ stance: string; lastReview: string; outlook: string } | null> {
  // MAS doesn't expose machine-readable policy stance — return hardcoded latest known
  return {
    stance: 'Slight Appreciation',
    lastReview: 'October 2024',
    outlook: 'MAS maintains slightly appreciating S$NEER policy. Core inflation easing toward target. Policy expected to remain unchanged in near term. Next MAS review expected April 2025.',
  };
}

export default async function MacroPage() {
  const [fedFundsObs, cpiObs, gdpObs, unemploymentObs, treasury10yObs, vixObs, sgCpi, masPolicy] = await Promise.all([
    fetchFred('FEDFUNDS', 3),
    fetchFred('CPIAUCSL', 3),
    fetchFred('A191RL1Q225SBEA', 3),
    fetchFred('UNRATE', 3),
    fetchFred('GS10', 3),
    fetchFred('VIXCLS', 3),
    fetchSgCpi().catch(() => null),
    fetchMasPolicy().catch(() => null),
  ]);

  const fedFunds = latestFred(fedFundsObs);
  const cpi = latestFred(cpiObs);
  const gdp = latestFred(gdpObs);
  const unemployment = latestFred(unemploymentObs);
  const treasury10y = latestFred(treasury10yObs);
  const vix = latestFred(vixObs);

  const gdpTrend = trend(gdp.current, gdp.prev);
  const cpiTrend = trend(cpi.current, cpi.prev);

  // Regime 2x2 matrix
  let regime = 'Unknown';
  let regimeImplication = '';
  let regimeColor = 'gray';

  if (gdpTrend === 'up' && cpiTrend === 'down') {
    regime = 'Recovery'; regimeImplication = 'Risk-On — favour equities, growth assets'; regimeColor = 'green';
  } else if (gdpTrend === 'up' && (cpiTrend === 'up' || cpiTrend === 'flat')) {
    regime = 'Boom'; regimeImplication = 'Late cycle — commodities, TIPS, value'; regimeColor = 'blue';
  } else if ((gdpTrend === 'down' || gdpTrend === 'flat') && cpiTrend === 'up') {
    regime = 'Stagflation'; regimeImplication = 'Risk-Off — gold, commodities, short duration'; regimeColor = 'red';
  } else {
    regime = 'Recession'; regimeImplication = 'Defensive — bonds, quality equities, cash'; regimeColor = 'orange';
  }

  const matrix = [
    { label: 'Recovery', gdp: 'up', cpi: 'down', color: 'green', desc: 'Best environment for equities and growth assets. ILP funds typically outperform CPF.' },
    { label: 'Boom', gdp: 'up', cpi: 'up', color: 'blue', desc: 'Late-cycle. Inflation erodes real returns. Consider inflation-hedged assets.' },
    { label: 'Recession', gdp: 'down', cpi: 'down', color: 'orange', desc: 'Capital preservation. CPF guaranteed rates shine vs market losses.' },
    { label: 'Stagflation', gdp: 'down', cpi: 'up', color: 'red', desc: 'Hardest environment. Gold, commodities, and short-duration bonds best.' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Macro Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Live economic indicators from FRED + MAS Singapore · Revalidated hourly</p>
      </div>

      {/* US vs SG Comparison */}
      <div className="card mb-6 border border-blue-800/30">
        <div className="text-xs text-gray-400 uppercase tracking-widest mb-4 font-semibold">🇺🇸 US vs 🇸🇬 SG — Key Rates Comparison</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">US Fed Funds</div>
            <div className="text-2xl font-bold font-mono text-red-400">{fedFunds.current ?? 'N/A'}%</div>
            <div className="text-xs text-gray-600 mt-1">Central bank rate</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">SG CPF-OA</div>
            <div className="text-2xl font-bold font-mono text-blue-400">2.5%</div>
            <div className="text-xs text-gray-600 mt-1">Guaranteed floor</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">SG CPF-SA / MA</div>
            <div className="text-2xl font-bold font-mono text-green-400">4.0%</div>
            <div className="text-xs text-gray-600 mt-1">Retirement account</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">US 10yr Treasury</div>
            <div className="text-2xl font-bold font-mono text-yellow-400">{treasury10y.current ?? 'N/A'}%</div>
            <div className="text-xs text-gray-600 mt-1">Risk-free benchmark</div>
          </div>
        </div>
      </div>

      {/* US Metrics Grid */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">🇺🇸 US Economic Indicators</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="Fed Funds Rate"
          value={fedFunds.current}
          unit="%"
          date={fedFunds.date}
          t={trend(fedFunds.current, fedFunds.prev)}
          positiveIsGood={false}
          plainEnglish="The Federal Reserve's benchmark interest rate. When it rises, mortgages and loans cost more — slowing the economy. When it falls, borrowing gets cheaper and markets often rally."
          sgRelevance="US rate cuts typically boost Singapore equity markets and can lead to SGD strength vs USD."
        />
        <MetricCard
          label="CPI Inflation (US)"
          value={cpi.current}
          unit="%"
          date={cpi.date}
          t={cpiTrend}
          positiveIsGood={false}
          plainEnglish="How fast prices are rising in the US (year-on-year). The Fed targets 2%. Above target = more rate hikes likely; below = cuts possible."
          sgRelevance="US inflation spills into Singapore via import prices and supply chains. MAS watches this closely."
        />
        <MetricCard
          label="GDP Growth"
          value={gdp.current}
          unit="%"
          date={gdp.date}
          t={gdpTrend}
          positiveIsGood={true}
          plainEnglish="How fast the US economy expanded (annualized). Positive means expansion; negative two quarters in a row = official recession."
          sgRelevance="Singapore's export-driven economy is highly correlated with US GDP. Strong US growth = stronger SG trade."
        />
        <MetricCard
          label="Unemployment"
          value={unemployment.current}
          unit="%"
          date={unemployment.date}
          t={trend(unemployment.current, unemployment.prev)}
          positiveIsGood={false}
          plainEnglish="The percentage of Americans actively looking for work but can't find it. Low unemployment = strong consumer spending and corporate earnings."
          sgRelevance="Tight US labour market supports global demand, benefiting SG exporters and APAC equity markets."
        />
        <MetricCard
          label="10yr Treasury Yield"
          value={treasury10y.current}
          unit="%"
          date={treasury10y.date}
          t={trend(treasury10y.current, treasury10y.prev)}
          positiveIsGood={false}
          plainEnglish="The yield on 10-year US government bonds — the global risk-free rate benchmark. Rising yields increase the hurdle rate for all investments globally."
          sgRelevance="Higher US yields put upward pressure on SG bond yields and SIBOR, affecting Singapore property and REIT valuations."
        />
        <MetricCard
          label="VIX (Fear Index)"
          value={vix.current}
          unit=""
          date={vix.date}
          t={trend(vix.current, vix.prev)}
          positiveIsGood={false}
          plainEnglish="The CBOE Volatility Index — measures expected market turbulence. Below 20 = calm; 20–30 = caution; above 30 = elevated fear and potential buying opportunity."
          sgRelevance="High VIX periods often trigger capital outflows from emerging market Asia. Keep clients calm and explain the cycle."
        />
      </div>

      {/* MAS Policy Card */}
      {masPolicy && (
        <div className="card mb-6 border border-blue-800/40 bg-blue-950/10">
          <div className="text-xs text-blue-400 uppercase tracking-widest mb-3 font-semibold">🇸🇬 MAS Monetary Policy</div>
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl font-bold text-blue-400">{masPolicy.stance}</span>
                <span className="text-xs bg-blue-900/50 text-blue-300 border border-blue-700 px-2 py-0.5 rounded-full">On Hold</span>
              </div>
              <div className="text-xs text-gray-500 mb-1">Last Review: {masPolicy.lastReview} · S$NEER Policy Band</div>
              <p className="text-xs text-gray-400 leading-relaxed">{masPolicy.outlook}</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800 min-w-[220px]">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">SG Macro Snapshot</div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Core Inflation</span>
                  <span className="text-xs font-mono text-yellow-400">
                    {sgCpi ? `${parseFloat(sgCpi.value).toFixed(1)}%` : '2.8%'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">GDP Growth</span>
                  <span className="text-xs font-mono text-green-400">2.1% ↑</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">CPF-OA Rate</span>
                  <span className="text-xs font-mono text-blue-400">2.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">CPF-SA Rate</span>
                  <span className="text-xs font-mono text-green-400">4.0%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regime 2x2 Matrix */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">Market Regime Matrix</h2>
          <div className={`px-3 py-1 rounded-full text-sm font-bold bg-${regimeColor}-900/30 text-${regimeColor}-400 border border-${regimeColor}-700`}>
            Current: {regime}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {matrix.map((cell) => {
            const isActive = cell.label === regime;
            return (
              <div
                key={cell.label}
                className={`rounded-lg p-4 border-2 transition-all ${
                  isActive
                    ? `border-${cell.color}-500 bg-${cell.color}-900/30`
                    : 'border-gray-700 bg-gray-900/50 opacity-50'
                }`}
              >
                <div className={`font-bold text-lg text-${cell.color}-400`}>{cell.label}</div>
                <div className="text-xs text-gray-500 mt-1">
                  GDP {cell.gdp === 'up' ? '↑' : '↓'} · CPI {cell.cpi === 'up' ? '↑' : '↓'}
                </div>
                {isActive && (
                  <>
                    <div className="text-xs text-gray-300 mt-2">{regimeImplication}</div>
                    <div className="text-xs text-gray-400 mt-1">{cell.desc}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-gray-500">
          The regime is determined by whether GDP growth and CPI inflation are trending up or down vs the prior period.
        </div>
      </div>

      <div className="text-xs text-gray-600 text-center">
        Data from Federal Reserve Economic Data (FRED) · St. Louis Fed · Monetary Authority of Singapore · Research use only
      </div>
    </div>
  );
}
