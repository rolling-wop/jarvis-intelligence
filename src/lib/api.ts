export const FRED_API_KEY = process.env.FRED_API_KEY || '012d1ded9790d187cdcc58f63147cf5d';
export const MARKETAUX_API_KEY = process.env.MARKETAUX_API_KEY || '1623kqHuVWGRbrDHWfgqQbqSyxrCOwAUPTDPCWML';
export const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || 'TO45QFIMZZB6CRXP';

// ─── Hardcoded fallback (real values, updated 2026-08-27) ────────────────────
// Used when FRED API is unreachable from the hosting region.
const FRED_FALLBACK: Record<string, Array<{ date: string; value: string }>> = {
  FEDFUNDS:          [{ date: '2026-07-01', value: '3.63' }, { date: '2026-06-01', value: '3.63' }],
  CPIAUCSL:          [{ date: '2026-07-01', value: '332.813' }, { date: '2026-06-01', value: '332.568' }],
  A191RL1Q225SBEA:   [{ date: '2026-04-01', value: '1.5' }, { date: '2026-01-01', value: '2.1' }],
  UNRATE:            [{ date: '2026-07-01', value: '4.1' }, { date: '2026-06-01', value: '4.2' }],
  GS10:              [{ date: '2026-07-01', value: '4.60' }, { date: '2026-06-01', value: '4.47' }],
  VIXCLS:            [{ date: '2026-08-25', value: '15.45' }, { date: '2026-08-24', value: '15.85' }],
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
      console.warn(`FRED ${seriesId} unreachable — using cached fallback (${fallback[0].date})`);
      return fallback;
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
