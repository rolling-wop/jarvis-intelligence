import { NextResponse } from 'next/server';
import { fetchFred, latestFred, trend } from '@/lib/api';

export const revalidate = 3600; // cache 1 hour

export async function GET() {
  try {
    const [fedFundsObs, cpiObs, gdpObs, unemploymentObs, treasury10yObs] = await Promise.all([
      fetchFred('FEDFUNDS', 3),
      fetchFred('CPIAUCSL', 3),
      fetchFred('A191RL1Q225SBEA', 3),
      fetchFred('UNRATE', 3),
      fetchFred('GS10', 3),
    ]);

    const fedFunds = latestFred(fedFundsObs);
    const cpi = latestFred(cpiObs);
    const gdp = latestFred(gdpObs);
    const unemployment = latestFred(unemploymentObs);
    const treasury10y = latestFred(treasury10yObs);

    return NextResponse.json({
      fedFunds: { ...fedFunds, trend: trend(fedFunds.current, fedFunds.prev) },
      cpi: { ...cpi, trend: trend(cpi.current, cpi.prev) },
      gdp: { ...gdp, trend: trend(gdp.current, gdp.prev) },
      unemployment: { ...unemployment, trend: trend(unemployment.current, unemployment.prev) },
      treasury10y: { ...treasury10y, trend: trend(treasury10y.current, treasury10y.prev) },
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Macro API error:', err);
    return NextResponse.json({ error: 'Failed to fetch macro data' }, { status: 500 });
  }
}
