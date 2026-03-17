import { NextRequest, NextResponse } from 'next/server';
import {
    analyzePortfolioAllocations,
    validatePortfolioAllocations,
    validatePortfolioHoldings,
} from '@/lib/portfolioAnalysis/riskEngine';
import { AnalyzePortfolioRequest } from '@/lib/portfolioAnalysis/types';
import { getMacroEnvironment } from '@/services/macroDataService';
import { getRecentNewsArticles } from '@/services/newsDataService';
import { classifyNewsEvents } from '@/lib/nlp/eventClassifier';

export async function POST(req: NextRequest) {
    const body = (await req.json()) as Partial<AnalyzePortfolioRequest>;
    const validationError = validatePortfolioAllocations(body.portfolio ?? []);
    const holdingsValidationError = validatePortfolioHoldings(body.holdings);

    if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (holdingsValidationError) {
        return NextResponse.json({ error: holdingsValidationError }, { status: 400 });
    }

    const [macroEnvironment, recentNewsArticles] = await Promise.all([
        getMacroEnvironment(),
        getRecentNewsArticles(),
    ]);
    const classifiedNewsEvents = await classifyNewsEvents(recentNewsArticles);
    const response = analyzePortfolioAllocations(
        body.portfolio ?? [],
        macroEnvironment,
        body.holdings ?? [],
        classifiedNewsEvents,
    );
    return NextResponse.json(response);
}
