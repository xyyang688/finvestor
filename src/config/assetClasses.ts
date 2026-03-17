export type AssetClassName =
    | 'Equities'
    | 'Fixed Income'
    | 'Commodities'
    | 'Real Assets'
    | 'Alternatives'
    | 'Cash & Liquidity';

export interface AssetExposureMetadata {
    equity?: boolean;
    domesticEquity?: boolean;
    internationalEquity?: boolean;
    durationSensitivity?: number;
    inflationHedge?: boolean;
    commodityExposure?: boolean;
    realAssetExposure?: boolean;
    liquidity?: boolean;
    sectorSpecific?: boolean;
}

export interface AssetClassOption {
    assetClass: AssetClassName;
    subAssetClass: string;
    color: string;
    metadata: AssetExposureMetadata;
}

const assetClassPalette: Record<AssetClassName, string> = {
    Equities: '#0f766e',
    'Fixed Income': '#2563eb',
    Commodities: '#f59e0b',
    'Real Assets': '#059669',
    Alternatives: '#7c3aed',
    'Cash & Liquidity': '#64748b',
};

function option(
    assetClass: AssetClassName,
    subAssetClass: string,
    metadata: AssetExposureMetadata,
): AssetClassOption {
    return {
        assetClass,
        subAssetClass,
        color: assetClassPalette[assetClass],
        metadata,
    };
}

export const assetClassConfig: Record<AssetClassName, AssetClassOption[]> = {
    Equities: [
        option('Equities', 'US Large Cap Stocks', { equity: true, domesticEquity: true }),
        option('Equities', 'US Mid Cap Stocks', { equity: true, domesticEquity: true }),
        option('Equities', 'US Small Cap Stocks', { equity: true, domesticEquity: true }),
        option('Equities', 'International Developed Stocks', { equity: true, internationalEquity: true }),
        option('Equities', 'Emerging Market Stocks', { equity: true, internationalEquity: true }),
        option('Equities', 'Global Equity ETF', { equity: true, domesticEquity: true, internationalEquity: true }),
        option('Equities', 'Sector ETF', { equity: true, domesticEquity: true, sectorSpecific: true }),
    ],
    'Fixed Income': [
        option('Fixed Income', 'US Treasuries (Short Duration)', { durationSensitivity: 0.25, liquidity: true }),
        option('Fixed Income', 'US Treasuries (Long Duration)', { durationSensitivity: 0.9 }),
        option('Fixed Income', 'Investment Grade Corporate Bonds', { durationSensitivity: 0.55 }),
        option('Fixed Income', 'High Yield Bonds', { durationSensitivity: 0.35 }),
        option('Fixed Income', 'International Bonds', { durationSensitivity: 0.45 }),
        option('Fixed Income', 'TIPS (Inflation Protected Bonds)', { durationSensitivity: 0.55, inflationHedge: true }),
        option('Fixed Income', 'Municipal Bonds', { durationSensitivity: 0.45 }),
        option('Fixed Income', 'Floating Rate Bonds', { durationSensitivity: 0.15 }),
    ],
    Commodities: [
        option('Commodities', 'Gold', { commodityExposure: true, inflationHedge: true }),
        option('Commodities', 'Silver', { commodityExposure: true, inflationHedge: true }),
        option('Commodities', 'Energy Commodities', { commodityExposure: true, inflationHedge: true }),
        option('Commodities', 'Industrial Metals', { commodityExposure: true }),
        option('Commodities', 'Agriculture Commodities', { commodityExposure: true }),
        option('Commodities', 'Broad Commodity ETF', { commodityExposure: true, inflationHedge: true }),
    ],
    'Real Assets': [
        option('Real Assets', 'REITs', { realAssetExposure: true, inflationHedge: true }),
        option('Real Assets', 'Infrastructure', { realAssetExposure: true, inflationHedge: true }),
        option('Real Assets', 'Farmland', { realAssetExposure: true, inflationHedge: true }),
        option('Real Assets', 'Timberland', { realAssetExposure: true, inflationHedge: true }),
    ],
    Alternatives: [
        option('Alternatives', 'Private Equity', {}),
        option('Alternatives', 'Hedge Funds', {}),
        option('Alternatives', 'Venture Capital', {}),
        option('Alternatives', 'Crypto', {}),
    ],
    'Cash & Liquidity': [
        option('Cash & Liquidity', 'Cash', { liquidity: true }),
        option('Cash & Liquidity', 'Money Market Funds', { liquidity: true }),
        option('Cash & Liquidity', 'Treasury Bills', { liquidity: true, durationSensitivity: 0.05 }),
        option('Cash & Liquidity', 'Short-Term Liquidity ETF', { liquidity: true, durationSensitivity: 0.1 }),
    ],
};

export const assetClassList = Object.keys(assetClassConfig) as AssetClassName[];

export const legacyAssetTypeMap: Record<string, { assetClass: AssetClassName; subAssetClass: string }> = {
    'us stocks': { assetClass: 'Equities', subAssetClass: 'US Large Cap Stocks' },
    'international stocks': { assetClass: 'Equities', subAssetClass: 'International Developed Stocks' },
    bonds: { assetClass: 'Fixed Income', subAssetClass: 'US Treasuries (Long Duration)' },
    cash: { assetClass: 'Cash & Liquidity', subAssetClass: 'Cash' },
};

export function findAssetOption(assetClass: string, subAssetClass: string) {
    const options = assetClassConfig[assetClass as AssetClassName];
    return options?.find((item) => item.subAssetClass === subAssetClass) ?? null;
}
