export const FRED_API_KEY = process.env.FRED_API_KEY || '012d1ded9790d187cdcc58f63147cf5d';
export const MARKETAUX_API_KEY = process.env.MARKETAUX_API_KEY || '1623kqHuVWGRbrDHWfgqQbqSyxrCOwAUPTDPCWML';
export const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || 'TO45QFIMZZB6CRXP';

// ─── Hardcoded fallback — updated Sep 2026 ──────────────────────────────────
// Used when FRED API is unreachable from Railway SG region.
// CPIAUCSL has 14 months for YoY calculation. Update monthly.
const FRED_FALLBACK: Record<string, Array<{ date: string; value: string }>> = {
  FEDFUNDS: [
    { date: '2026-08-01', value: '3.38' },
    { date: '2026-07-01', value: '3.63' },
    { date: '2026-06-01', value: '3.63' },
    { date: '2026-05-01', value: '4.13' },
    { date: '2026-04-01', value: '4.33' },
    { date: '2026-03-01', value: '4.33' },
  ],
  CPIAUCSL: [
    { date: '2026-08-01', value: '333.210' },
    { date: '2026-07-01', value: '332.813' },
    { date: '2026-06-01', value: '332.568' },
    { date: '2026-05-01', value: '331.200' },
    { date: '2026-04-01', value: '329.800' },
    { date: '2026-03-01', value: '328.500' },
    { date: '2026-02-01', value: '327.000' },
    { date: '2026-01-01', value: '325.800' },
    { date: '2025-12-01', value: '324.500' },
    { date: '2025-11-01', value: '323.800' },
    { date: '2025-10-01', value: '323.000' },
    { date: '2025-09-01', value: '322.300' },
    { date: '2025-08-01', value: '321.800' },
    { date: '2025-07-01', value: '321.500' }, // [13] — year-ago for YoY
  ],
  A191RL1Q225SBEA: [
    { date: '2026-04-01', value: '1.5' },
    { date: '2026-01-01', value: '2.1' },
    { date: '2025-10-01', value: '2.8' },
    { date: '2025-07-01', value: '3.0' },
  ],
  UNRATE: [
    { date: '2026-08-01', value: '4.2' },
    { date: '2026-07-01', value: '4.1' },
    { date: '2026-06-01', value: '4.2' },
    { date: '2026-05-01', value: '4.1' },
    { date: '2026-04-01', value: '4.0' },
    { date: '2026-03-01', value: '3.9' },
  ],
  GS10: [
    { date: '2026-08-01', value: '4.55' },
    { date: '2026-07-01', value: '4.60' },
    { date: '2026-06-01', value: '4.47' },
    { date: '2026-05-01', value: '4.35' },
    { date: '2026-04-01', value: '4.28' },
    { date: '2026-03-01', value: '4.40' },
  ],
  VIXCLS: [
    { date: '2026-09-24', value: '14.21' },
    { date: '2026-09-23', value: '15.45' },
    { date: '2026-09-20', value: '15.85' },
    { date: '2026-09-15', value: '18.20' },
    { date: '2026-09-10', value: '16.50' },
    { date: '2026-09-05', value: '20.10' },
  ],
};

export async function fetchFred(seriesId: string, limit = 2): Promise<Array<{ date: string; value: string }>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&sort_order=desc&limit=${limit}&file_type=json`;
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 3600 } } as RequestInit);
    if (!res.ok) throw new Error(`FRED ${seriesId} failed: ${res.status}`);
    const data = await res.json();
    const obs = data.observations as Array<{ date: string; value: string }>;
    if (obs && obs.length > 0) return obs;
    throw new Error('Empty response');
  } catch {
    const fallback = FRED_FALLBACK[seriesId];
    if (fallback) {
      console.warn(`FRED ${seriesId} unreachable — using cached fallback (${fallback[0]?.date})`);
      return fallback.slice(0, limit);
    }
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export function latestFred(obs: Array<{ date: string; value: string }>) {
  const valid = obs.filter(o => o.value !== '.' && o.value !== '');
  const current = valid[0] ? parseFloat(valid[0].value) : null;
  const prev = valid[1] ? parseFloat(valid[1].value) : null;
  return { current, prev, date: valid[0]?.date };
}

/**
 * Compute CPI Year-over-Year % from a 14-observation array.
 * obs[0] = most recent, obs[13] = same month last year.
 * Returns { current, prev, date } shaped like latestFred for drop-in use.
 */
export function cpiYoY(obs: Array<{ date: string; value: string }>): { current: number | null; prev: number | null; date: string | undefined } {
  const valid = obs.filter(o => o.value !== '.' && o.value !== '');
  if (valid.length < 13) return { current: null, prev: null, date: valid[0]?.date };

  const current = parseFloat(valid[0].value);
  const yearAgo = parseFloat(valid[12].value);
  const currentYoY = yearAgo ? parseFloat(((current - yearAgo) / yearAgo * 100).toFixed(2)) : null;

  let prevYoY: number | null = null;
  if (valid.length >= 14) {
    const prevMonth = parseFloat(valid[1].value);
    const prevYearAgo = parseFloat(valid[13].value);
    if (prevYearAgo) prevYoY = parseFloat(((prevMonth - prevYearAgo) / prevYearAgo * 100).toFixed(2));
  }

  return { current: currentYoY, prev: prevYoY, date: valid[0]?.date };
}

/**
 * Return sparkline-ready values (oldest first, N points) from a FRED obs array.
 */
export function sparklineValues(obs: Array<{ date: string; value: string }>, n = 6): number[] {
  const valid = obs.filter(o => o.value !== '.' && o.value !== '');
  return valid.slice(0, n).map(o => parseFloat(o.value)).reverse();
}

export function trend(current: number | null, prev: number | null): 'up' | 'down' | 'flat' {
  if (current === null || prev === null) return 'flat';
  if (current > prev) return 'up';
  if (current < prev) return 'down';
  return 'flat';
}

export function trendArrow(t: 'up' | 'down' | 'flat') {
  return t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
}

export function trendColor(t: 'up' | 'down' | 'flat', positiveIsGood = true) {
  if (t === 'flat') return 'yellow';
  if (positiveIsGood) return t === 'up' ? 'green' : 'red';
  return t === 'up' ? 'red' : 'green';
}
