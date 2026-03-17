import { ClassifiedNewsEvent, NormalizedPortfolioAllocation, PortfolioHoldingInput } from '@/lib/portfolioAnalysis/types';
import { findAssetOption } from '@/config/assetClasses';

type EventRiskMapping = {
    labels: string[];
    allocationMatcher: (allocation: NormalizedPortfolioAllocation) => boolean;
    holdingMatcher: (ticker: string) => boolean;
};

const TECH_TICKERS = new Set(['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'QQQ', 'XLK', 'SMH']);
const ENERGY_TICKERS = new Set(['XLE', 'CVX', 'XOM', 'COP', 'SLB', 'OIH', 'USO']);
const FINANCIAL_TICKERS = new Set(['JPM', 'BAC', 'C', 'WFC', 'KRE', 'XLF']);
const CHINA_SENSITIVE_TICKERS = new Set(['NVDA', 'AAPL', 'TSM', 'BABA', 'EEM', 'FXI', 'QQQ']);

const eventRiskMappings: Record<ClassifiedNewsEvent['eventType'], EventRiskMapping> = {
    geopolitical: {
        labels: ['Energy Commodities', 'Broad Commodity ETF', 'Emerging Market Stocks', 'International Developed Stocks', 'Gold'],
        allocationMatcher: (allocation) =>
            allocation.assetClass === 'Commodities' ||
            allocation.subAssetClass === 'Emerging Market Stocks' ||
            allocation.subAssetClass === 'International Developed Stocks' ||
            allocation.subAssetClass === 'Gold',
        holdingMatcher: (ticker) => ENERGY_TICKERS.has(ticker) || CHINA_SENSITIVE_TICKERS.has(ticker),
    },
    regulation: {
        labels: ['Sector ETF', 'US Large Cap Stocks', 'Global Equity ETF'],
        allocationMatcher: (allocation) =>
            allocation.assetClass === 'Equities' &&
            ['Sector ETF', 'US Large Cap Stocks', 'Global Equity ETF'].includes(allocation.subAssetClass),
        holdingMatcher: (ticker) => TECH_TICKERS.has(ticker) || FINANCIAL_TICKERS.has(ticker),
    },
    macroPolicy: {
        labels: ['US Treasuries (Long Duration)', 'Investment Grade Corporate Bonds', 'High Yield Bonds', 'US Large Cap Stocks'],
        allocationMatcher: (allocation) =>
            allocation.assetClass === 'Fixed Income' ||
            allocation.subAssetClass === 'US Large Cap Stocks',
        holdingMatcher: () => false,
    },
    energyCommodities: {
        labels: ['Energy Commodities', 'Broad Commodity ETF', 'Sector ETF', 'Gold'],
        allocationMatcher: (allocation) =>
            allocation.assetClass === 'Commodities' ||
            allocation.subAssetClass === 'Sector ETF' ||
            allocation.subAssetClass === 'Gold',
        holdingMatcher: (ticker) => ENERGY_TICKERS.has(ticker),
    },
    technology: {
        labels: ['US Large Cap Stocks', 'US Mid Cap Stocks', 'Global Equity ETF', 'Sector ETF'],
        allocationMatcher: (allocation) =>
            allocation.assetClass === 'Equities' &&
            ['US Large Cap Stocks', 'US Mid Cap Stocks', 'Global Equity ETF', 'Sector ETF'].includes(allocation.subAssetClass),
        holdingMatcher: (ticker) => TECH_TICKERS.has(ticker),
    },
    financialStress: {
        labels: ['High Yield Bonds', 'Investment Grade Corporate Bonds', 'Sector ETF'],
        allocationMatcher: (allocation) =>
            allocation.subAssetClass === 'High Yield Bonds' ||
            allocation.subAssetClass === 'Investment Grade Corporate Bonds' ||
            allocation.subAssetClass === 'Sector ETF',
        holdingMatcher: (ticker) => FINANCIAL_TICKERS.has(ticker),
    },
    general: {
        labels: ['Global Equity ETF', 'US Large Cap Stocks'],
        allocationMatcher: (allocation) => allocation.assetClass === 'Equities',
        holdingMatcher: () => false,
    },
};

function clampExposure(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

export function mapEventToPortfolioExposure(
    event: ClassifiedNewsEvent,
    portfolio: NormalizedPortfolioAllocation[],
    holdings: PortfolioHoldingInput[],
) {
    const mapping = eventRiskMappings[event.eventType];
    const matchingAllocations = portfolio.filter((allocation) => mapping.allocationMatcher(allocation));
    const allocationExposure = matchingAllocations.reduce((sum, allocation) => sum + allocation.weight, 0);

    const normalizedHoldings = holdings
        .map((holding) => ({
            ticker: holding.ticker.trim().toUpperCase(),
            weight: holding.weight,
        }))
        .filter((holding) => holding.ticker && holding.weight > 0);
    const matchingHoldings = normalizedHoldings.filter(
        (holding) =>
            event.relatedTickers.includes(holding.ticker) ||
            mapping.holdingMatcher(holding.ticker),
    );
    const holdingsExposure = matchingHoldings.reduce((sum, holding) => sum + holding.weight, 0);
    const matchedAssetLabels = new Set<string>(mapping.labels);

    matchingAllocations.forEach((allocation) => {
        const assetOption = findAssetOption(allocation.assetClass, allocation.subAssetClass);
        matchedAssetLabels.add(assetOption?.subAssetClass ?? allocation.subAssetClass);
    });

    matchingHoldings.forEach((holding) => matchedAssetLabels.add(holding.ticker));

    return {
        portfolioExposure: clampExposure(Math.min(100, allocationExposure + holdingsExposure * 0.6)),
        affectedAssets: Array.from(matchedAssetLabels).slice(0, 4),
    };
}
