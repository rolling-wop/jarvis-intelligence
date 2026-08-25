import { NextResponse } from 'next/server';
import { fetchFred, latestFred, trend } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [gdpObs, cpiObs] = await Promise.all([
      fetchFred('A191RL1Q225SBEA', 3),
      fetchFred('CPIAUCSL', 3),
    ]);

    const gdp = latestFred(gdpObs);
    const cpi = latestFred(cpiObs);

    const gdpTrend = trend(gdp.current, gdp.prev);
    const cpiTrend = trend(cpi.current, cpi.prev);

    // 2x2 Matrix: GDP growth vs Inflation
    let regime: string;
    let color: string;
    let description: string;
    let implication: string;

    if (gdpTrend === 'up' && cpiTrend === 'down') {
      regime = 'Recovery';
      color = 'green';
      description = 'Growth accelerating, inflation cooling';
      implication = 'Risk-on. Equities, growth assets favored.';
    } else if (gdpTrend === 'up' && (cpiTrend === 'up' || cpiTrend === 'flat')) {
      regime = 'Boom';
      color = 'blue';
      description = 'Growth strong, inflation rising';
      implication = 'Late cycle. Commodities, TIPS, value equities.';
    } else if ((gdpTrend === 'down' || gdpTrend === 'flat') && cpiTrend === 'up') {
      regime = 'Stagflation';
      color = 'red';
      description = 'Growth slowing, inflation persisting';
      implication = 'Risk-off. Commodities, gold, short duration.';
    } else {
      regime = 'Recession';
      color = 'orange';
      description = 'Growth contracting, inflation easing';
      implication = 'Defensive. Bonds, quality equities, cash.';
    }

    return NextResponse.json({
      regime,
      color,
      description,
      implication,
      gdpTrend,
      cpiTrend,
      gdpValue: gdp.current,
      cpiValue: cpi.current,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Regime API error:', err);
    return NextResponse.json({ error: 'Failed to compute regime' }, { status: 500 });
  }
}
