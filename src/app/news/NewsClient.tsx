'use client';

import { useState } from 'react';

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

function SentimentBadge({ score }: { score: number }) {
  if (score > 0.1) return <span className="badge-bullish">Bullish</span>;
  if (score < -0.1) return <span className="badge-bearish">Bearish</span>;
  return <span className="badge-neutral">Neutral</span>;
}

function isSgRelevant(article: Article): boolean {
  const text = (article.title + ' ' + (article.description ?? '')).toLowerCase();
  return (
    text.includes('singapore') || text.includes('sgd') || text.includes('sti') ||
    text.includes('mas ') || text.includes('asean') ||
    article.symbol === 'EWS' || article.symbol === 'D05.SI'
  );
}

function isAsiaRelevant(article: Article): boolean {
  const text = (article.title + ' ' + (article.description ?? '')).toLowerCase();
  return (
    text.includes('asia') || text.includes('china') || text.includes('japan') ||
    text.includes('korea') || text.includes('taiwan') || text.includes('hong kong') ||
    text.includes('india') || text.includes('malaysia') || text.includes('indonesia') ||
    text.includes('apac') || text.includes('pacific')
  );
}

function isUsRelevant(article: Article): boolean {
  const text = (article.title + ' ' + (article.description ?? '')).toLowerCase();
  return (
    article.symbol === 'SPY' || article.symbol === 'QQQ' || article.symbol === 'TLT' ||
    text.includes('federal reserve') || text.includes('fed ') || text.includes('nasdaq') ||
    text.includes('s&p') || text.includes('wall street') || text.includes('u.s.')
  );
}

type FilterTab = 'all' | 'singapore' | 'us' | 'asia';

export default function NewsClient({ articles, wsb }: { articles: Article[]; wsb: WsbItem[] }) {
  const [filter, setFilter] = useState<FilterTab>('all');

  const filteredArticles = articles.filter(a => {
    if (filter === 'singapore') return isSgRelevant(a);
    if (filter === 'us') return isUsRelevant(a);
    if (filter === 'asia') return isAsiaRelevant(a);
    return true;
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: articles.length },
    { key: 'singapore', label: '🇸🇬 Singapore', count: articles.filter(isSgRelevant).length },
    { key: 'us', label: '🇺🇸 US', count: articles.filter(isUsRelevant).length },
    { key: 'asia', label: '🌏 Asia', count: articles.filter(isAsiaRelevant).length },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* News Feed */}
      <div className="lg:col-span-2">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
              }`}
            >
              {tab.label} {tab.count > 0 && <span className="opacity-60 ml-1">({tab.count})</span>}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredArticles.length > 0 ? filteredArticles.map((article, i) => {
            const sgTag = isSgRelevant(article);
            const summary = article.description
              ? article.description.slice(0, 130) + (article.description.length > 130 ? '...' : '')
              : null;

            return (
              <a
                key={i}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card block hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-100 leading-snug mb-1">{article.title}</div>
                    {summary && (
                      <div className="text-xs text-gray-500 mb-1">{summary}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-gray-600">
                        {article.source} · {new Date(article.publishedAt).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      {sgTag && (
                        <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-800/50 px-1.5 py-0.5 rounded">
                          🇸🇬 SG Relevant
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                    {article.symbol && (
                      <span className="text-xs font-mono text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded">
                        {article.symbol}
                      </span>
                    )}
                    <SentimentBadge score={article.sentiment} />
                  </div>
                </div>
              </a>
            );
          }) : (
            <div className="card text-gray-500 text-sm">
              No articles match this filter.
            </div>
          )}
        </div>
      </div>

      {/* WSB Sidebar */}
      <div>
        <div className="card sticky top-20">
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">r/wallstreetbets Sentiment</div>
          {wsb.length > 0 ? (
            <div className="space-y-3">
              {wsb.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-mono font-bold text-white">{item.ticker}</div>
                    <div className="text-xs text-gray-500">{item.no_of_comments.toLocaleString()} comments</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={item.sentiment === 'Bullish' ? 'badge-bullish' : item.sentiment === 'Bearish' ? 'badge-bearish' : 'badge-neutral'}>
                      {item.sentiment}
                    </span>
                    <div className="w-24 bg-gray-800 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${item.sentiment === 'Bullish' ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(Math.abs(item.sentiment_score) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-xs">WSB data unavailable</div>
          )}
          <div className="mt-4 pt-3 border-t border-gray-800 text-xs text-gray-600">
            Source: tradestie.com · Hourly
          </div>

          {/* SG Advisor Note */}
          <div className="mt-4 bg-blue-950/20 border border-blue-800/30 rounded-lg p-3">
            <div className="text-xs text-blue-400 font-semibold mb-1">🇸🇬 For SG Advisors</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              US market sentiment directly impacts SG investors holding global ILP sub-funds. High WSB bearish sentiment often precedes retail capitulation — potential buying opportunity for disciplined long-term investors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
