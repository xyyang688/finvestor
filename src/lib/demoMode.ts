export const isDemoModeEnabled = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
export const demoUserEmail = 'demo@finvestor.local';
const demoPortfolioStorageKey = 'finvestor.demo.portfolios';

export const demoPortfolio = {
    id: 'demo-portfolio',
    age: 29,
    risk_tolerance: 'Moderate',
    investment_goal: 'Build long-term wealth while keeping enough flexibility for a home down payment.',
    time_horizon: 8,
    ai_recommendation: {
        recommendation:
            'A balanced portfolio could start around 65% diversified stock index funds, 25% bonds, and 10% cash or short-term treasuries. This keeps growth potential while reducing volatility and preserving some near-term liquidity.',
        generated_at: '2026-03-16T12:00:00.000Z',
    },
    created_at: '2026-03-16T12:00:00.000Z',
};

export const demoPortfolioHistory = [
    demoPortfolio,
    {
        id: 'demo-portfolio-2',
        age: 29,
        risk_tolerance: 'Moderately Aggressive',
        investment_goal: 'Maximize retirement growth over the next decade.',
        time_horizon: 10,
        ai_recommendation: {
            recommendation:
                'Consider an equity-heavier mix near 80% global stock funds, 15% bonds, and 5% cash reserves. This leans into long-term growth while keeping a modest cushion for volatility.',
            generated_at: '2026-02-20T15:30:00.000Z',
        },
        created_at: '2026-02-20T15:30:00.000Z',
    },
];

export function loadDemoPortfolios() {
    if (typeof window === 'undefined') {
        return demoPortfolioHistory;
    }

    const stored = window.localStorage.getItem(demoPortfolioStorageKey);

    if (!stored) {
        return demoPortfolioHistory;
    }

    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : demoPortfolioHistory;
    } catch {
        return demoPortfolioHistory;
    }
}

export function saveDemoPortfolio(portfolio: unknown) {
    if (typeof window === 'undefined') {
        return;
    }

    const current = loadDemoPortfolios();
    window.localStorage.setItem(demoPortfolioStorageKey, JSON.stringify([portfolio, ...current]));
}
