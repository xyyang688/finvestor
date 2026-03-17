import {
    AnalyzePortfolioResponse,
    PortfolioAllocationInput,
    PortfolioHoldingInput,
} from '@/lib/portfolioAnalysis/types';

export async function analyzePortfolioRisk(
    portfolio: PortfolioAllocationInput[],
    holdings: PortfolioHoldingInput[] = [],
): Promise<AnalyzePortfolioResponse> {
    const response = await fetch('/api/portfolio/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ portfolio, holdings }),
    });

    const payload = await response.json();

    if (!response.ok) {
        throw new Error(payload.error || 'Unable to analyze portfolio risk.');
    }

    return payload;
}
