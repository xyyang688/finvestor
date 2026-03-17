import { InflationTrend, MacroEnvironmentSnapshot } from '@/lib/portfolioAnalysis/types';

type FredObservation = {
    date: string;
    value: string;
};

type FredObservationResponse = {
    observations: FredObservation[];
};

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';
const CACHE_TTL_MS = 1000 * 60 * 30;

let macroCache:
    | {
          expiresAt: number;
          data: MacroEnvironmentSnapshot;
      }
    | null = null;

function getFallbackMacroEnvironment(): MacroEnvironmentSnapshot {
    return {
        interestRate: 4.75,
        tenYearYield: 4.2,
        inflationTrend: 'stable',
        unemploymentRate: 4.1,
        marketVolatility: 18,
    };
}

async function fetchFredSeries(seriesId: string, limit: number) {
    const apiKey = process.env.FRED_API_KEY;

    if (!apiKey) {
        throw new Error('Missing FRED_API_KEY.');
    }

    const url = new URL(FRED_BASE_URL);
    url.searchParams.set('series_id', seriesId);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('file_type', 'json');
    url.searchParams.set('sort_order', 'desc');
    url.searchParams.set('limit', String(limit));

    const response = await fetch(url.toString(), {
        next: { revalidate: 1800 },
    });

    if (!response.ok) {
        throw new Error(`FRED request failed for ${seriesId}.`);
    }

    return (await response.json()) as FredObservationResponse;
}

function numericObservations(observations: FredObservation[]) {
    return observations
        .filter((observation) => observation.value !== '.')
        .map((observation) => Number(observation.value))
        .filter((value) => Number.isFinite(value));
}

function detectInflationTrend(cpiValues: number[]): InflationTrend {
    if (cpiValues.length < 13) {
        return 'stable';
    }

    const latestYearOverYear = ((cpiValues[0] - cpiValues[12]) / cpiValues[12]) * 100;
    const previousYearOverYear = ((cpiValues[1] - cpiValues[12]) / cpiValues[12]) * 100;
    const delta = latestYearOverYear - previousYearOverYear;

    if (delta > 0.2) {
        return 'rising';
    }

    if (delta < -0.2) {
        return 'falling';
    }

    return 'stable';
}

export async function getMacroEnvironment(): Promise<MacroEnvironmentSnapshot> {
    if (macroCache && Date.now() < macroCache.expiresAt) {
        return macroCache.data;
    }

    try {
        const [fedFunds, tenYearYield, cpi, unemployment, vix] = await Promise.all([
            fetchFredSeries('FEDFUNDS', 3),
            fetchFredSeries('DGS10', 5),
            fetchFredSeries('CPIAUCSL', 13),
            fetchFredSeries('UNRATE', 2),
            fetchFredSeries('VIXCLS', 5),
        ]);

        const fedFundsValues = numericObservations(fedFunds.observations);
        const tenYearValues = numericObservations(tenYearYield.observations);
        const cpiValues = numericObservations(cpi.observations);
        const unemploymentValues = numericObservations(unemployment.observations);
        const vixValues = numericObservations(vix.observations);

        const macroEnvironment: MacroEnvironmentSnapshot = {
            interestRate: fedFundsValues[0] ?? getFallbackMacroEnvironment().interestRate,
            tenYearYield: tenYearValues[0] ?? getFallbackMacroEnvironment().tenYearYield,
            inflationTrend: detectInflationTrend(cpiValues),
            unemploymentRate: unemploymentValues[0] ?? getFallbackMacroEnvironment().unemploymentRate,
            marketVolatility: vixValues[0] ?? getFallbackMacroEnvironment().marketVolatility,
        };

        macroCache = {
            data: macroEnvironment,
            expiresAt: Date.now() + CACHE_TTL_MS,
        };

        return macroEnvironment;
    } catch {
        const fallback = getFallbackMacroEnvironment();
        macroCache = {
            data: fallback,
            expiresAt: Date.now() + CACHE_TTL_MS,
        };
        return fallback;
    }
}
