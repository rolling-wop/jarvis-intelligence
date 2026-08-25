import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://tradestie.com/api/v1/apps/reddit', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Tradestie failed: ${res.status}`);
    const data = await res.json();

    // Filter for SPY and QQQ
    const relevant = (data || [])
      .filter((item: { ticker: string; sentiment: string; sentiment_score: number; no_of_comments: number }) =>
        ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL'].includes(item.ticker)
      )
      .slice(0, 10);

    return NextResponse.json({ sentiment: relevant, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Sentiment API error:', err);
    return NextResponse.json({ sentiment: [], error: 'Failed to fetch sentiment' }, { status: 500 });
  }
}
