export type InflationTrend = 'rising' | 'stable' | 'falling';

export interface PortfolioAllocationInput {
    assetClass?: string;
    subAssetClass?: string;
    assetType?: string;
    weight: number;
}

export interface PortfolioHoldingInput {
    ticker: string;
    weight: number;
}

export interface NormalizedPortfolioAllocation {
    assetClass: string;
    subAssetClass: string;
    weight: number;
}

export interface AnalyzePortfolioRequest {
    portfolio: PortfolioAllocationInput[];
    holdings?: PortfolioHoldingInput[];
}

export interface PortfolioRiskBreakdown {
    concentration: number;
    diversification: number;
    defensiveBuffer: number;
    liquidity: number;
    equityExposure: number;
    macro: number;
    news: number;
}

export interface MacroEnvironmentSnapshot {
    interestRate: number;
    tenYearYield: number;
    inflationTrend: InflationTrend;
    unemploymentRate: number;
    marketVolatility: number;
}

export interface NewsArticleSnapshot {
    title: string;
    summary: string;
    source: string;
    timestamp: string;
    relatedTickers: string[];
    url: string;
}

export type NewsEventType =
    | 'geopolitical'
    | 'regulation'
    | 'macroPolicy'
    | 'energyCommodities'
    | 'technology'
    | 'financialStress'
    | 'general';

export type NewsEventSeverity = 'high' | 'medium' | 'low';

export interface ClassifiedNewsEvent {
    title: string;
    source: string;
    timestamp: string;
    url: string;
    relatedTickers: string[];
    eventType: NewsEventType;
    severity: NewsEventSeverity;
    affectedSectors: string[];
    affectedRegions: string[];
    confidence: number;
}

export interface PortfolioNewsRiskEvent {
    title: string;
    source: string;
    timestamp: string;
    url: string;
    eventType: NewsEventType;
    severity: NewsEventSeverity;
    affectedAssets: string[];
    portfolioExposure: number;
    confidence: number;
}

export interface PortfolioRiskAnalysisResult {
    riskScore: number;
    marketRegime: string;
    riskBreakdown: PortfolioRiskBreakdown;
    macroEnvironment: MacroEnvironmentSnapshot;
    newsRisk: number;
    recentEvents: PortfolioNewsRiskEvent[];
    topRisks: string[];
    recommendations: string[];
    summary: string;
}

export interface AnalyzePortfolioResponse {
    success: boolean;
    data: PortfolioRiskAnalysisResult;
}
