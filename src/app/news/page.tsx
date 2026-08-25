export const dynamic = 'force-dynamic';

import { MARKETAUX_API_KEY } from '@/lib/api';
import NewsClient from './NewsClient';

interface Article {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  description: string;
  sentiment: number;
  symbol: string;
}

interface WsbItem {
  ticker: string;
  sentiment: string;
  sentiment_score: number;
  no_of_comments: number;
}

async function getNews(): Promise<Article[]> {
  try {
    const symbols = 'SPY,QQQ,EWS,NVDA,TLT,DBS,OCBC';
    const url = `https://api.marketaux.com/v1/news/all?symbols=${symbols}&filter_entities=true&language=en&api_token=${MARKETAUX_API_KEY}&limit=20`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((a: {
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
      description: a.description ?? '',
      sentiment: a.entities?.[0]?.sentiment_score ?? 0,
      symbol: a.entities?.[0]?.symbol ?? '',
    }));
  } catch { return []; }
}

async function getWsb(): Promise<WsbItem[]> {
  try {
    const res = await fetch('https://tradestie.com/api/v1/apps/reddit', { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).slice(0, 8);
  } catch { return []; }
}

export default async function NewsPage() {
  const [articles, wsb] = await Promise.all([getNews(), getWsb()]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Market News</h1>
        <p className="text-gray-500 text-sm mt-1">
          SPY · QQQ · EWS · NVDA · TLT · DBS · OCBC · Revalidated every 30min
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Filter by region. Articles tagged 🇸🇬 SG Relevant when Singapore context detected.
        </p>
      </div>

      <NewsClient articles={articles} wsb={wsb} />
    </div>
  );
}
