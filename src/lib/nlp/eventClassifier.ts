import OpenAI from 'openai';
import { ClassifiedNewsEvent, NewsArticleSnapshot, NewsEventSeverity, NewsEventType } from '@/lib/portfolioAnalysis/types';

const RECENCY_LIMIT_MS = 48 * 60 * 60 * 1000;
const CLASSIFICATION_CACHE_TTL_MS = 15 * 60 * 1000;

const openaiClient = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;
const classificationCache = new Map<string, { expiresAt: number; result: ClassifiedNewsEvent }>();

function normalizeSeverity(value: string | undefined): NewsEventSeverity {
    if (value === 'high' || value === 'medium' || value === 'low') {
        return value;
    }

    return 'low';
}

function normalizeEventType(value: string | undefined): NewsEventType {
    if (
        value === 'geopolitical' ||
        value === 'regulation' ||
        value === 'macroPolicy' ||
        value === 'energyCommodities' ||
        value === 'technology' ||
        value === 'financialStress' ||
        value === 'general'
    ) {
        return value;
    }

    return 'general';
}

function buildFallbackClassification(article: NewsArticleSnapshot): ClassifiedNewsEvent {
    const haystack = `${article.title} ${article.summary}`.toLowerCase();

    let eventType: NewsEventType = 'general';
    let severity: NewsEventSeverity = 'low';
    let affectedSectors: string[] = [];
    let affectedRegions: string[] = [];
    let confidence = 0.66;

    if (/war|sanction|trade conflict|tension|shipping lane|middle east|export restriction/.test(haystack)) {
        eventType = 'geopolitical';
        severity = 'high';
        affectedSectors = ['energy', 'defense', 'industrials'];
        affectedRegions = ['Middle East', 'Global'];
        confidence = 0.84;
    } else if (/ai regulation|antitrust|tech regulation|regulator|compliance/.test(haystack)) {
        eventType = 'regulation';
        severity = 'medium';
        affectedSectors = ['technology'];
        affectedRegions = ['United States'];
        confidence = 0.82;
    } else if (/federal reserve|central bank|stimulus|tax policy|rate decision/.test(haystack)) {
        eventType = 'macroPolicy';
        severity = 'medium';
        affectedSectors = ['broad market', 'fixed income'];
        affectedRegions = ['United States'];
        confidence = 0.78;
    } else if (/oil|opec|supply disruption|commodity|mining/.test(haystack)) {
        eventType = 'energyCommodities';
        severity = 'high';
        affectedSectors = ['energy', 'commodities'];
        affectedRegions = ['Global'];
        confidence = 0.86;
    } else if (/cybersecurity|chip|semiconductor|technology platform|ai/.test(haystack)) {
        eventType = 'technology';
        severity = 'medium';
        affectedSectors = ['technology', 'semiconductors'];
        affectedRegions = ['United States', 'Asia'];
        confidence = 0.76;
    } else if (/bank|liquidity crisis|credit event|funding stress/.test(haystack)) {
        eventType = 'financialStress';
        severity = 'high';
        affectedSectors = ['financials', 'credit'];
        affectedRegions = ['United States'];
        confidence = 0.83;
    }

    return {
        title: article.title,
        source: article.source,
        timestamp: article.timestamp,
        url: article.url,
        relatedTickers: article.relatedTickers,
        eventType,
        severity,
        affectedSectors,
        affectedRegions,
        confidence,
    };
}

async function classifyWithOpenAI(article: NewsArticleSnapshot) {
    if (!openaiClient) {
        return null;
    }

    const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: 'Classify financial news into structured risk events. Return strict JSON with eventType, severity, affectedSectors, affectedRegions, confidence. eventType must be one of geopolitical, regulation, macroPolicy, energyCommodities, technology, financialStress, general. severity must be high, medium, or low.',
            },
            {
                role: 'user',
                content: JSON.stringify(article),
            },
        ],
    });

    const rawContent = completion.choices[0]?.message?.content;

    if (!rawContent) {
        return null;
    }

    const parsed = JSON.parse(rawContent) as Partial<ClassifiedNewsEvent>;

    return {
        title: article.title,
        source: article.source,
        timestamp: article.timestamp,
        url: article.url,
        relatedTickers: article.relatedTickers,
        eventType: normalizeEventType(parsed.eventType),
        severity: normalizeSeverity(parsed.severity),
        affectedSectors: Array.isArray(parsed.affectedSectors) ? parsed.affectedSectors.filter(Boolean) : [],
        affectedRegions: Array.isArray(parsed.affectedRegions) ? parsed.affectedRegions.filter(Boolean) : [],
        confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.7,
    } satisfies ClassifiedNewsEvent;
}

export async function classifyNewsEvents(articles: NewsArticleSnapshot[]) {
    const freshArticles = articles.filter((article) => Date.now() - new Date(article.timestamp).getTime() <= RECENCY_LIMIT_MS);

    const results = await Promise.all(
        freshArticles.map(async (article) => {
            const cacheKey = `${article.title}:${article.timestamp}`;
            const cached = classificationCache.get(cacheKey);

            if (cached && cached.expiresAt > Date.now()) {
                return cached.result;
            }

            try {
                const result = (await classifyWithOpenAI(article)) ?? buildFallbackClassification(article);
                classificationCache.set(cacheKey, {
                    expiresAt: Date.now() + CLASSIFICATION_CACHE_TTL_MS,
                    result,
                });
                return result;
            } catch {
                const result = buildFallbackClassification(article);
                classificationCache.set(cacheKey, {
                    expiresAt: Date.now() + CLASSIFICATION_CACHE_TTL_MS,
                    result,
                });
                return result;
            }
        }),
    );

    return results.filter((event) => event.confidence >= 0.6);
}
