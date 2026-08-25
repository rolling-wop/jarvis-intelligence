import { NextResponse } from 'next/server';
import { ALPHA_VANTAGE_KEY, fetchFred, latestFred } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function fetchQuote(symbol: string) {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();
    const q = data['Global Quote'];
    if (!q || !q['05. price']) return null;
    return {
      symbol,
      price: parseFloat(q['05. price']),
      change: parseFloat(q['09. change']),
      changePercent: q['10. change percent']?.replace('%', '') ?? '0',
    };
  } catch {
    return null;
  }
}

async function fetchSgdUsd() {
  try {
    const res = await fetch(
      'https://api.mas.gov.sg/api/action/datastore/search.json?resource_id=95932927-c8bc-4e7a-b484-68a66a24edfe&limit=1',
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const records = data?.result?.records;
    if (records?.[0]) {
      const rec = records[0];
      const keys = Object.keys(rec).filter(k => k !== '_id' && k !== 'end_of_day');
      // SGD/USD is typically 1/SGD per USD
      const key = keys.find(k => k.toLowerCase().includes('usd') || k.toLowerCase().includes('sgd'));
      if (key && rec[key]) {
        return parseFloat(rec[key]);
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const [spy, qqq, btc, vixObs, sgdUsd] = await Promise.all([
      fetchQuote('SPY'),
      fetchQuote('QQQ'),
      fetchQuote('BTC-USD'),
      fetchFred('VIXCLS', 2),
      fetchSgdUsd(),
    ]);

    const vixData = latestFred(vixObs);

    return NextResponse.json({
      spy,
      qqq,
      btc,
      vix: vixData.current,
      sgdUsd,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Markets API error:', err);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
