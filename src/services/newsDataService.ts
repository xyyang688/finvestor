import { NewsArticleSnapshot } from '@/lib/portfolioAnalysis/types';

interface NewsProvider {
    getRecentNews(): Promise<NewsArticleSnapshot[]>;
}

const CACHE_TTL_MS = 15 * 60 * 1000;

const staticNewsArticles: NewsArticleSnapshot[] = [
    {
        title: 'Oil supply disruption raises concern over shipping lanes and energy prices',
        summary: 'Energy markets reacted to a disruption in regional supply flows, adding pressure to commodity prices and transport costs.',
        source: 'Reuters',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        relatedTickers: ['XLE', 'CVX', 'XOM'],
        url: 'https://example.com/oil-supply-disruption',
    },
    {
        title: 'Policymakers weigh new AI regulation for large technology platforms',
        summary: 'New AI governance proposals could affect compliance costs and product rollouts across major technology companies.',
        source: 'Financial Times',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        relatedTickers: ['NVDA', 'MSFT', 'AAPL', 'QQQ'],
        url: 'https://example.com/ai-regulation-proposal',
    },
    {
        title: 'Regional bank funding stress draws renewed attention from regulators',
        summary: 'Funding pressure and tighter conditions are driving concern across parts of the banking system and credit markets.',
        source: 'Bloomberg',
        timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        relatedTickers: ['JPM', 'BAC', 'XLF'],
        url: 'https://example.com/bank-stress-watch',
    },
];

class StaticNewsProvider implements NewsProvider {
    async getRecentNews() {
        return staticNewsArticles;
    }
}

let cache: { expiresAt: number; articles: NewsArticleSnapshot[] } | null = null;
const provider: NewsProvider = new StaticNewsProvider();

export async function getRecentNewsArticles() {
    const now = Date.now();

    if (cache && cache.expiresAt > now) {
        return cache.articles;
    }

    const articles = await provider.getRecentNews();
    cache = {
        expiresAt: now + CACHE_TTL_MS,
        articles,
    };

    return articles;
}
