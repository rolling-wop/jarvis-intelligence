import { NextResponse } from 'next/server';
import { MARKETAUX_API_KEY } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const symbols = 'SPY,QQQ,EWS,NVDA,TLT';
    const url = `https://api.marketaux.com/v1/news/all?symbols=${symbols}&filter_entities=true&language=en&api_token=${MARKETAUX_API_KEY}&limit=20`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`MarketAux failed: ${res.status}`);
    const data = await res.json();

    const articles = (data.data || []).map((a: {
      title: string;
      url: string;
      source: string;
      published_at: string;
      description: string;
      entities?: Array<{ sentiment_score?: number; symbol?: string }>;
    }) => ({
      title: a.title,
      url: a.url,
      source: a.source,
      publishedAt: a.published_at,
      description: a.description,
      sentiment: a.entities?.[0]?.sentiment_score ?? 0,
      symbol: a.entities?.[0]?.symbol ?? '',
    }));

    return NextResponse.json({ articles, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('News API error:', err);
    return NextResponse.json({ articles: [], error: 'Failed to fetch news' }, { status: 500 });
  }
}
