export const FRED_API_KEY = process.env.FRED_API_KEY || '012d1ded9790d187cdcc58f63147cf5d';
export const MARKETAUX_API_KEY = process.env.MARKETAUX_API_KEY || '1623kqHuVWGRbrDHWfgqQbqSyxrCOwAUPTDPCWML';
export const ALPHA_VANTAGE_KEY = 'TO45QFIMZZB6CRXP';

export async function fetchFred(seriesId: string, limit = 2): Promise<Array<{ date: string; value: string }>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&sort_order=desc&limit=${limit}&file_type=json`;
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 3600 } } as RequestInit);
    if (!res.ok) throw new Error(`FRED ${seriesId} failed: ${res.status}`);
    const data = await res.json();
    return data.observations as Array<{ date: string; value: string }>;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn(`FRED ${seriesId} timed out — returning empty`);
      return [];
    }
    console.warn(`FRED ${seriesId} error:`, err);
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
