import {
    AnalyzePortfolioResponse,
    ClassifiedNewsEvent,
    MacroEnvironmentSnapshot,
    NormalizedPortfolioAllocation,
    PortfolioAllocationInput,
    PortfolioHoldingInput,
    PortfolioRiskAnalysisResult,
    PortfolioRiskBreakdown,
} from '@/lib/portfolioAnalysis/types';
import { calculateMacroRisk, marketRegimeFromMacroRisk } from '@/lib/portfolioAnalysis/macroRiskCalculator';
import { findAssetOption, legacyAssetTypeMap } from '@/config/assetClasses';
import { calculateNewsRisk } from '@/lib/portfolioAnalysis/newsRiskCalculator';

const TOTAL_WEIGHT_TOLERANCE = 1;
const FINAL_RISK_WEIGHTS = {
    allocation: 0.35,
    macro: 0.35,
    news: 0.3,
} as const;

function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeLegacyAssetType(assetType: string) {
    return assetType.trim().toLowerCase();
}

function normalizePortfolioAllocation(item: PortfolioAllocationInput): NormalizedPortfolioAllocation | null {
    if (item.assetClass && item.subAssetClass) {
        const assetOption = findAssetOption(item.assetClass, item.subAssetClass);

        if (!assetOption) {
            return null;
        }

        return {
            assetClass: assetOption.assetClass,
            subAssetClass: assetOption.subAssetClass,
            weight: item.weight,
        };
    }

    if (item.assetType) {
        const mapped = legacyAssetTypeMap[normalizeLegacyAssetType(item.assetType)];

        if (!mapped) {
            return null;
        }

        return {
            ...mapped,
            weight: item.weight,
        };
    }

    return null;
}

function optionFor(allocation: NormalizedPortfolioAllocation) {
    return findAssetOption(allocation.assetClass, allocation.subAssetClass);
}

function exposureWeightFor(
    portfolio: NormalizedPortfolioAllocation[],
    matcher: (allocation: NormalizedPortfolioAllocation) => boolean,
) {
    return portfolio
        .filter((allocation) => matcher(allocation))
        .reduce((sum, allocation) => sum + allocation.weight, 0);
}

function computeExposureProfile(portfolio: NormalizedPortfolioAllocation[]) {
    return {
        equityExposure: exposureWeightFor(portfolio, (allocation) => Boolean(optionFor(allocation)?.metadata.equity)),
        durationExposure: exposureWeightFor(
            portfolio,
            (allocation) => (optionFor(allocation)?.metadata.durationSensitivity ?? 0) >= 0.5,
        ),
        inflationHedgeExposure: exposureWeightFor(
            portfolio,
            (allocation) => Boolean(optionFor(allocation)?.metadata.inflationHedge),
        ),
        commodityExposure: exposureWeightFor(
            portfolio,
            (allocation) => Boolean(optionFor(allocation)?.metadata.commodityExposure),
        ),
        realAssetExposure: exposureWeightFor(
            portfolio,
            (allocation) => Boolean(optionFor(allocation)?.metadata.realAssetExposure),
        ),
        liquidityExposure: exposureWeightFor(
            portfolio,
            (allocation) => Boolean(optionFor(allocation)?.metadata.liquidity),
        ),
    };
}

function equityExposureRisk(equityWeight: number) {
    if (equityWeight <= 40) {
        return clampScore(20 + (equityWeight / 40) * 20);
    }

    if (equityWeight <= 60) {
        return clampScore(40 + (equityWeight - 40) * 1.25);
    }

    if (equityWeight <= 80) {
        return clampScore(65 + (equityWeight - 60) * 1.25);
    }

    return clampScore(90 + (equityWeight - 80) * 0.5);
}

function concentrationRisk(
    usStocksWeight: number,
    internationalStocksWeight: number,
    largestWeight: number,
    equityWeight: number,
    sectorWeight: number,
) {
    const usDominanceRisk = equityWeight === 0
        ? 10
        : clampScore(15 + Math.max(0, (usStocksWeight / equityWeight) * 100 - 50) * 1.4);
    const lowInternationalRisk = internationalStocksWeight >= 20
        ? 20
        : clampScore(20 + (20 - internationalStocksWeight) * 2.5);
    const largestHoldingRisk = largestWeight <= 35
        ? 20
        : clampScore(20 + (largestWeight - 35) * 2.4);
    const sectorRisk = sectorWeight <= 10 ? 15 : clampScore(15 + (sectorWeight - 10) * 2.2);

    return clampScore(
        usDominanceRisk * 0.35 + lowInternationalRisk * 0.2 + largestHoldingRisk * 0.25 + sectorRisk * 0.2,
    );
}

function defensiveBufferRisk(defensiveWeight: number) {
    if (defensiveWeight >= 40) {
        return 20;
    }

    if (defensiveWeight >= 25) {
        return clampScore(20 + (40 - defensiveWeight) * 2);
    }

    if (defensiveWeight >= 10) {
        return clampScore(50 + (25 - defensiveWeight) * 2);
    }

    return clampScore(80 + (10 - defensiveWeight) * 2);
}

function liquidityRisk(cashWeight: number) {
    if (cashWeight >= 15) {
        return 20;
    }

    if (cashWeight >= 10) {
        return clampScore(20 + (15 - cashWeight) * 3);
    }

    if (cashWeight >= 5) {
        return clampScore(35 + (10 - cashWeight) * 5);
    }

    return clampScore(60 + (5 - cashWeight) * 5);
}

function diversificationRisk(portfolio: NormalizedPortfolioAllocation[], largestWeight: number) {
    const meaningfulBuckets = portfolio.filter((item) => item.weight >= 10).length;
    const majorAssetClasses = new Set(portfolio.map((item) => item.assetClass)).size;
    const bucketCountRisk =
        meaningfulBuckets >= 4 ? 20 :
        meaningfulBuckets === 3 ? 40 :
        meaningfulBuckets === 2 ? 70 :
        95;
    const majorClassRisk =
        majorAssetClasses >= 4 ? 15 :
        majorAssetClasses === 3 ? 35 :
        majorAssetClasses === 2 ? 60 :
        85;

    const hhi = portfolio.reduce((sum, item) => sum + (item.weight / 100) ** 2, 0);
    const hhiRisk = clampScore(((hhi - 0.25) / 0.35) * 100);
    const dominanceRisk = largestWeight <= 35 ? 20 : clampScore(20 + (largestWeight - 35) * 2);

    return clampScore(bucketCountRisk * 0.25 + majorClassRisk * 0.2 + hhiRisk * 0.35 + dominanceRisk * 0.2);
}

function deriveTopRisks(breakdown: PortfolioRiskBreakdown) {
    const candidates = [
        { label: 'Macro conditions are adding broad market stress', score: breakdown.macro },
        { label: 'Global event flow is creating portfolio-specific headline risk', score: breakdown.news },
        { label: 'Elevated overall equity exposure', score: breakdown.equityExposure },
        { label: 'High concentration in US-heavy or sector-heavy allocations', score: breakdown.concentration },
        { label: 'Limited defensive buffer from fixed income and liquidity assets', score: breakdown.defensiveBuffer },
        { label: 'Thin liquidity buffer for short-term flexibility', score: breakdown.liquidity },
        { label: 'Portfolio diversification is weaker than ideal', score: breakdown.diversification },
    ];

    const filtered = candidates
        .filter((item) => item.score >= 50)
        .sort((left, right) => right.score - left.score)
        .slice(0, 3)
        .map((item) => item.label);

    return filtered.length > 0 ? filtered : ['Portfolio structure appears broadly balanced across the current allocation mix'];
}

function deriveRecommendations(
    breakdown: PortfolioRiskBreakdown,
    usStocksWeight: number,
    internationalStocksWeight: number,
    defensiveWeight: number,
    liquidityWeight: number,
    macroEnvironment: MacroEnvironmentSnapshot,
    exposureProfile: ReturnType<typeof computeExposureProfile>,
    newsRisk: number,
) {
    const recommendations: string[] = [];

    if (breakdown.macro >= 65) {
        recommendations.push('Lean slightly more defensive while macro conditions remain stressed by rates, labor, or volatility.');
    }

    if (newsRisk >= 60) {
        recommendations.push('Review portfolio exposure to current global event clusters and reduce the sleeves most tied to headline-sensitive assets.');
    }

    if (breakdown.equityExposure >= 70) {
        recommendations.push('Consider reducing equity concentration by shifting part of the portfolio toward lower-volatility assets.');
    }

    if (breakdown.concentration >= 60 || (usStocksWeight >= 50 && internationalStocksWeight < 20)) {
        recommendations.push('Improve geographic diversification so the portfolio is less dependent on one equity market.');
    }

    if (breakdown.defensiveBuffer >= 55 || defensiveWeight < 25) {
        recommendations.push('Increase fixed income or cash-like assets to create a stronger defensive buffer during drawdowns.');
    }

    if (breakdown.liquidity >= 55 || liquidityWeight < 5) {
        recommendations.push('Build a larger liquidity sleeve to improve flexibility for rebalancing and near-term uncertainty.');
    }

    if (macroEnvironment.inflationTrend === 'rising' && exposureProfile.inflationHedgeExposure < 10) {
        recommendations.push('Add some inflation-sensitive exposure such as TIPS, commodities, or real assets.');
    }

    if (breakdown.diversification >= 55) {
        recommendations.push('Spread risk across more asset buckets instead of relying on one or two dominant sleeves.');
    }

    if (recommendations.length === 0) {
        recommendations.push('Maintain the current balanced allocation and review drift regularly as markets move.');
    }

    return recommendations.slice(0, 3);
}

function riskBandLabel(riskScore: number) {
    if (riskScore >= 70) {
        return 'high';
    }

    if (riskScore >= 40) {
        return 'moderate';
    }

    return 'lower';
}

function buildSummary(
    riskScore: number,
    breakdown: PortfolioRiskBreakdown,
    recommendations: string[],
    marketRegime: string,
) {
    const driverPairs: Array<[string, number]> = [
        ['macro stress', breakdown.macro],
        ['news-driven event risk', breakdown.news],
        ['equity exposure', breakdown.equityExposure],
        ['concentration', breakdown.concentration],
        ['defensive buffer weakness', breakdown.defensiveBuffer],
        ['liquidity pressure', breakdown.liquidity],
        ['diversification weakness', breakdown.diversification],
    ];

    const orderedDrivers = driverPairs
        .sort((left, right) => right[1] - left[1])
        .slice(0, 2)
        .map(([label]) => label);

    const riskBand = riskBandLabel(riskScore);
    const primaryGuidance = recommendations[0]?.replace(/\.$/, '').toLowerCase() ?? 'keep the allocation under review';

    return `This portfolio currently screens as ${riskBand} risk in a ${marketRegime.toLowerCase()}, driven mainly by ${orderedDrivers.join(
        ' and ',
    )}. A practical next step is to ${primaryGuidance}.`;
}

export function validatePortfolioAllocations(portfolio: PortfolioAllocationInput[]) {
    if (!Array.isArray(portfolio) || portfolio.length === 0) {
        return 'Portfolio must contain at least one allocation item.';
    }

    const invalidItem = portfolio.find(
        (item) =>
            typeof item?.weight !== 'number' ||
            !Number.isFinite(item.weight) ||
            item.weight < 0 ||
            !normalizePortfolioAllocation(item),
    );

    if (invalidItem) {
        return 'Each portfolio item must include a valid assetClass + subAssetClass pair, or a supported legacy assetType, plus a non-negative numeric weight.';
    }

    const totalWeight = portfolio.reduce((sum, item) => sum + item.weight, 0);

    if (Math.abs(totalWeight - 100) > TOTAL_WEIGHT_TOLERANCE) {
        return `Portfolio weights must total approximately 100%. Current total is ${totalWeight.toFixed(2)}%.`;
    }

    return null;
}

export function validatePortfolioHoldings(holdings: PortfolioHoldingInput[] | undefined) {
    if (holdings === undefined) {
        return null;
    }

    if (!Array.isArray(holdings)) {
        return 'Holdings must be provided as an array when included.';
    }

    const invalidHolding = holdings.find(
        (holding) =>
            typeof holding?.ticker !== 'string' ||
            holding.ticker.trim().length === 0 ||
            typeof holding?.weight !== 'number' ||
            !Number.isFinite(holding.weight) ||
            holding.weight < 0,
    );

    if (invalidHolding) {
        return 'Each holding must include a ticker and a non-negative numeric weight.';
    }

    return null;
}

export function analyzePortfolioAllocations(
    portfolio: PortfolioAllocationInput[],
    macroEnvironment: MacroEnvironmentSnapshot,
    holdings: PortfolioHoldingInput[] = [],
    classifiedNewsEvents: ClassifiedNewsEvent[] = [],
): AnalyzePortfolioResponse {
    const normalizedPortfolio = portfolio
        .map((item) => normalizePortfolioAllocation(item))
        .filter((item): item is NormalizedPortfolioAllocation => Boolean(item));

    const exposureProfile = computeExposureProfile(normalizedPortfolio);
    const fixedIncomeWeight = exposureWeightFor(normalizedPortfolio, (allocation) => allocation.assetClass === 'Fixed Income');
    const liquidityWeight = exposureProfile.liquidityExposure;
    const defensiveWeight = fixedIncomeWeight + liquidityWeight;
    const usStocksWeight = exposureWeightFor(
        normalizedPortfolio,
        (allocation) => Boolean(optionFor(allocation)?.metadata.domesticEquity),
    );
    const internationalStocksWeight = exposureWeightFor(
        normalizedPortfolio,
        (allocation) => Boolean(optionFor(allocation)?.metadata.internationalEquity),
    );
    const sectorWeight = exposureWeightFor(
        normalizedPortfolio,
        (allocation) => Boolean(optionFor(allocation)?.metadata.sectorSpecific),
    );
    const largestWeight = Math.max(...normalizedPortfolio.map((item) => item.weight));

    const { macroRisk } = calculateMacroRisk(macroEnvironment);
    const newsResult = calculateNewsRisk(classifiedNewsEvents, normalizedPortfolio, holdings);

    const riskBreakdown: PortfolioRiskBreakdown = {
        concentration: concentrationRisk(
            usStocksWeight,
            internationalStocksWeight,
            largestWeight,
            exposureProfile.equityExposure,
            sectorWeight,
        ),
        diversification: diversificationRisk(normalizedPortfolio, largestWeight),
        defensiveBuffer: defensiveBufferRisk(defensiveWeight),
        liquidity: liquidityRisk(liquidityWeight),
        equityExposure: equityExposureRisk(exposureProfile.equityExposure),
        macro: macroRisk,
        news: newsResult.newsRisk,
    };

    const allocationRiskScore = clampScore(
        riskBreakdown.concentration * 0.25 +
            riskBreakdown.diversification * 0.15 +
            riskBreakdown.defensiveBuffer * 0.2 +
            riskBreakdown.liquidity * 0.15 +
            riskBreakdown.equityExposure * 0.25,
    );
    const riskScore = clampScore(
        allocationRiskScore * FINAL_RISK_WEIGHTS.allocation +
        macroRisk * FINAL_RISK_WEIGHTS.macro +
        newsResult.newsRisk * FINAL_RISK_WEIGHTS.news,
    );
    const marketRegime = newsResult.newsRisk >= 65
        ? 'Event-Driven Risk-Off'
        : marketRegimeFromMacroRisk(macroRisk);

    const recommendations = deriveRecommendations(
        riskBreakdown,
        usStocksWeight,
        internationalStocksWeight,
        defensiveWeight,
        liquidityWeight,
        macroEnvironment,
        exposureProfile,
        newsResult.newsRisk,
    );

    const result: PortfolioRiskAnalysisResult = {
        riskScore,
        marketRegime,
        riskBreakdown,
        macroEnvironment,
        newsRisk: newsResult.newsRisk,
        recentEvents: newsResult.recentEvents,
        topRisks: deriveTopRisks(riskBreakdown),
        recommendations,
        summary: buildSummary(riskScore, riskBreakdown, recommendations, marketRegime),
    };

    return {
        success: true,
        data: result,
    };
}

export function analyzeExamplePortfolios() {
    const cases = {
        aggressive: [
            { assetClass: 'Equities', subAssetClass: 'US Large Cap Stocks', weight: 70 },
            { assetClass: 'Equities', subAssetClass: 'International Developed Stocks', weight: 15 },
            { assetClass: 'Fixed Income', subAssetClass: 'US Treasuries (Long Duration)', weight: 10 },
            { assetClass: 'Cash & Liquidity', subAssetClass: 'Cash', weight: 5 },
        ],
        balanced: [
            { assetClass: 'Equities', subAssetClass: 'US Large Cap Stocks', weight: 45 },
            { assetClass: 'Equities', subAssetClass: 'International Developed Stocks', weight: 20 },
            { assetClass: 'Fixed Income', subAssetClass: 'US Treasuries (Long Duration)', weight: 25 },
            { assetClass: 'Cash & Liquidity', subAssetClass: 'Cash', weight: 10 },
        ],
        defensive: [
            { assetClass: 'Equities', subAssetClass: 'US Large Cap Stocks', weight: 25 },
            { assetClass: 'Equities', subAssetClass: 'International Developed Stocks', weight: 10 },
            { assetClass: 'Fixed Income', subAssetClass: 'US Treasuries (Long Duration)', weight: 45 },
            { assetClass: 'Cash & Liquidity', subAssetClass: 'Cash', weight: 20 },
        ],
    };

    const scenarios: Record<string, MacroEnvironmentSnapshot> = {
        highRateEnvironment: {
            interestRate: 5.5,
            tenYearYield: 4.8,
            inflationTrend: 'rising',
            unemploymentRate: 4.7,
            marketVolatility: 28,
        },
        lowInflationEnvironment: {
            interestRate: 2.75,
            tenYearYield: 3.1,
            inflationTrend: 'falling',
            unemploymentRate: 3.9,
            marketVolatility: 14,
        },
        highVolatilityEnvironment: {
            interestRate: 4.75,
            tenYearYield: 4.3,
            inflationTrend: 'stable',
            unemploymentRate: 4.4,
            marketVolatility: 35,
        },
    };

    return Object.fromEntries(
        Object.entries(cases).map(([key, portfolio]) => [
            key,
            Object.fromEntries(
                Object.entries(scenarios).map(([scenarioName, macroEnvironment]) => [
                    scenarioName,
                    analyzePortfolioAllocations(portfolio, macroEnvironment),
                ]),
            ),
        ]),
    );
}
