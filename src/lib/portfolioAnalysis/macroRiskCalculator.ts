import { MacroEnvironmentSnapshot } from '@/lib/portfolioAnalysis/types';

function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function interestRateRisk(interestRate: number, tenYearYield: number) {
    // High policy rates and elevated long-end yields usually tighten financial conditions.
    const fedFundsComponent =
        interestRate <= 2 ? 15 :
        interestRate <= 4 ? 35 :
        interestRate <= 5 ? 55 :
        75;
    const tenYearComponent =
        tenYearYield <= 3 ? 20 :
        tenYearYield <= 4 ? 35 :
        tenYearYield <= 5 ? 55 :
        70;

    return clampScore(fedFundsComponent * 0.6 + tenYearComponent * 0.4);
}

function inflationTrendRisk(inflationTrend: MacroEnvironmentSnapshot['inflationTrend']) {
    // Rising inflation adds uncertainty because discount rates and policy expectations can shift quickly.
    if (inflationTrend === 'rising') {
        return 70;
    }

    if (inflationTrend === 'stable') {
        return 40;
    }

    return 20;
}

function laborMarketRisk(unemploymentRate: number) {
    // Higher unemployment implies more recession sensitivity and weaker growth backdrop.
    if (unemploymentRate < 4) {
        return 20;
    }

    if (unemploymentRate < 5) {
        return 40;
    }

    if (unemploymentRate < 6) {
        return 65;
    }

    return 80;
}

function volatilityRisk(marketVolatility: number) {
    // Higher VIX generally indicates more stressed market conditions and wider potential drawdowns.
    if (marketVolatility < 15) {
        return 20;
    }

    if (marketVolatility < 20) {
        return 35;
    }

    if (marketVolatility < 30) {
        return 65;
    }

    return 85;
}

export function calculateMacroRisk(macroEnvironment: MacroEnvironmentSnapshot) {
    const rateRisk = interestRateRisk(macroEnvironment.interestRate, macroEnvironment.tenYearYield);
    const inflationRisk = inflationTrendRisk(macroEnvironment.inflationTrend);
    const employmentRisk = laborMarketRisk(macroEnvironment.unemploymentRate);
    const marketStressRisk = volatilityRisk(macroEnvironment.marketVolatility);

    const macroRisk = clampScore(
        rateRisk * 0.35 +
            inflationRisk * 0.2 +
            employmentRisk * 0.2 +
            marketStressRisk * 0.25,
    );

    return {
        macroRisk,
        components: {
            rateRisk,
            inflationRisk,
            employmentRisk,
            marketStressRisk,
        },
    };
}

export function marketRegimeFromMacroRisk(macroRisk: number) {
    if (macroRisk >= 65) {
        return 'Risk-Off Environment';
    }

    if (macroRisk >= 40) {
        return 'Neutral / Mixed Macro Environment';
    }

    return 'Risk-On Environment';
}
