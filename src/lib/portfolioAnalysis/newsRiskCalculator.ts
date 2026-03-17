import { mapEventToPortfolioExposure } from '@/config/eventRiskMappings';
import {
    ClassifiedNewsEvent,
    NormalizedPortfolioAllocation,
    PortfolioHoldingInput,
    PortfolioNewsRiskEvent,
} from '@/lib/portfolioAnalysis/types';

export interface NewsRiskResult {
    newsRisk: number;
    recentEvents: PortfolioNewsRiskEvent[];
}

const SEVERITY_WEIGHTS = {
    high: 90,
    medium: 60,
    low: 30,
} as const;

function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function recencyMultiplier(timestamp: string) {
    const hoursOld = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);

    if (hoursOld <= 24) {
        return 1;
    }

    if (hoursOld <= 48) {
        return 0.7;
    }

    return 0;
}

export function calculateNewsRisk(
    events: ClassifiedNewsEvent[],
    portfolio: NormalizedPortfolioAllocation[],
    holdings: PortfolioHoldingInput[],
): NewsRiskResult {
    const relevantEvents = events
        .map((event) => {
            const mappedExposure = mapEventToPortfolioExposure(event, portfolio, holdings);
            const exposureWeight = mappedExposure.portfolioExposure / 100;
            const score = SEVERITY_WEIGHTS[event.severity] * exposureWeight * event.confidence * recencyMultiplier(event.timestamp);

            return {
                event,
                mappedExposure,
                score,
            };
        })
        .filter((item) => item.mappedExposure.portfolioExposure >= 5 && item.score >= 8)
        .sort((left, right) => right.score - left.score);

    const clusteringBonus = relevantEvents.length >= 3 ? 10 : relevantEvents.length === 2 ? 5 : 0;
    const aggregateScore = relevantEvents.reduce((sum, item) => sum + item.score, 0);
    const newsRisk = clampScore(Math.min(100, aggregateScore + clusteringBonus));

    return {
        newsRisk,
        recentEvents: relevantEvents.slice(0, 5).map(({ event, mappedExposure }) => ({
            title: event.title,
            source: event.source,
            timestamp: event.timestamp,
            url: event.url,
            eventType: event.eventType,
            severity: event.severity,
            affectedAssets: mappedExposure.affectedAssets,
            portfolioExposure: mappedExposure.portfolioExposure,
            confidence: Number(event.confidence.toFixed(2)),
        })),
    };
}
