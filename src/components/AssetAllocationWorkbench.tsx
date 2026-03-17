'use client';

import { useId, useMemo, useState } from 'react';
import { analyzePortfolioRisk } from '@/lib/portfolioAnalysis/client';
import {
    PortfolioAllocationInput,
    PortfolioHoldingInput,
    PortfolioRiskAnalysisResult,
} from '@/lib/portfolioAnalysis/types';
import { assetClassConfig, assetClassList, AssetClassName } from '@/config/assetClasses';

type AllocationRow = {
    id: string;
    assetClass: AssetClassName;
    subAssetClass: string;
    percentage: number;
    color: string;
};

type HoldingRow = {
    id: string;
    ticker: string;
    weight: number;
};

const initialRows: AllocationRow[] = [
    { id: 'stocks', assetClass: 'Equities', subAssetClass: 'US Large Cap Stocks', percentage: 45, color: assetClassConfig.Equities[0].color },
    { id: 'intl-stocks', assetClass: 'Equities', subAssetClass: 'International Developed Stocks', percentage: 20, color: assetClassConfig.Equities[0].color },
    { id: 'bonds', assetClass: 'Fixed Income', subAssetClass: 'US Treasuries (Long Duration)', percentage: 25, color: assetClassConfig['Fixed Income'][0].color },
    { id: 'cash', assetClass: 'Cash & Liquidity', subAssetClass: 'Cash', percentage: 10, color: assetClassConfig['Cash & Liquidity'][0].color },
];

const initialHoldings: HoldingRow[] = [
    { id: 'aapl', ticker: 'AAPL', weight: 12 },
    { id: 'nvda', ticker: 'NVDA', weight: 10 },
    { id: 'msft', ticker: 'MSFT', weight: 8 },
    { id: 'qqq', ticker: 'QQQ', weight: 15 },
];

function clampPercentage(value: number) {
    if (Number.isNaN(value)) {
        return 0;
    }

    return Math.min(100, Math.max(0, value));
}

export default function AssetAllocationWorkbench() {
    const riskBreakdownLabels: Record<keyof PortfolioRiskAnalysisResult['riskBreakdown'], string> = {
        concentration: 'Concentration',
        diversification: 'Diversification',
        defensiveBuffer: 'Defensive Buffer',
        liquidity: 'Liquidity',
        equityExposure: 'Equity Exposure',
        macro: 'Macro',
        news: 'News',
    };
    const idPrefix = useId();
    const [allocations, setAllocations] = useState<AllocationRow[]>(initialRows);
    const [holdings, setHoldings] = useState<HoldingRow[]>(initialHoldings);
    const [selectedSliceId, setSelectedSliceId] = useState<string | null>(initialRows[0].id);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<PortfolioRiskAnalysisResult | null>(null);

    const total = allocations.reduce((sum, row) => sum + row.percentage, 0);
    const holdingsTotal = holdings.reduce((sum, row) => sum + row.weight, 0);
    const normalizedTotal = total === 0 ? 1 : total;
    const selectedSlice = allocations.find((row) => row.id === selectedSliceId) ?? allocations[0] ?? null;

    const summaryText = useMemo(() => {
        const lines = allocations.map((row) => `- ${row.assetClass} / ${row.subAssetClass}: ${row.percentage}%`);
        const notes = total === 100
            ? 'Current mix is balanced to 100%.'
            : total < 100
                ? `You still have ${100 - total}% unassigned.`
                : `You are over-allocated by ${total - 100}%.`;

        return [`Current Asset Allocation`, ...lines, '', `Total: ${total}%`, notes].join('\n');
    }, [allocations, total]);

    const portfolioPayload: PortfolioAllocationInput[] = allocations.map((row) => ({
        assetClass: row.assetClass,
        subAssetClass: row.subAssetClass,
        weight: row.percentage,
    }));
    const holdingsPayload: PortfolioHoldingInput[] = holdings
        .filter((row) => row.ticker.trim().length > 0 && row.weight > 0)
        .map((row) => ({
            ticker: row.ticker.trim().toUpperCase(),
            weight: row.weight,
        }));

    const conicStops = allocations.reduce<string[]>((stops, row, index) => {
        const previousValue = stops.length === 0
            ? 0
            : allocations
                  .slice(0, index)
                  .reduce((sum, current) => sum + current.percentage, 0);
        const start = (previousValue / normalizedTotal) * 360;
        const end = ((previousValue + row.percentage) / normalizedTotal) * 360;
        stops.push(`${row.color} ${start}deg ${end}deg`);
        return stops;
    }, []);

    const chartStyle = {
        background: `conic-gradient(${conicStops.join(', ')})`,
    };

    const updateRow = (id: string, patch: Partial<AllocationRow>) => {
        setAllocations((current) =>
            current.map((row) =>
                row.id === id
                    ? {
                          ...row,
                          ...patch,
                      }
                    : row,
            ),
        );
    };

    const updateHolding = (id: string, patch: Partial<HoldingRow>) => {
        setHoldings((current) =>
            current.map((row) =>
                row.id === id
                    ? {
                          ...row,
                          ...patch,
                      }
                    : row,
            ),
        );
    };

    const addRow = () => {
        const nextIndex = allocations.length;
        const defaultAssetClass: AssetClassName = 'Equities';
        const defaultOption = assetClassConfig[defaultAssetClass][0];
        const newRow: AllocationRow = {
            id: `${idPrefix}-${nextIndex}`,
            assetClass: defaultAssetClass,
            subAssetClass: defaultOption.subAssetClass,
            percentage: 0,
            color: defaultOption.color,
        };

        setAllocations((current) => [...current, newRow]);
        setSelectedSliceId(newRow.id);
    };

    const removeRow = (id: string) => {
        setAllocations((current) => current.filter((row) => row.id !== id));

        if (selectedSliceId === id) {
            const remaining = allocations.filter((row) => row.id !== id);
            setSelectedSliceId(remaining[0]?.id ?? null);
        }
    };

    const addHolding = () => {
        setHoldings((current) => [
            ...current,
            {
                id: `${idPrefix}-holding-${current.length}`,
                ticker: '',
                weight: 0,
            },
        ]);
    };

    const removeHolding = (id: string) => {
        setHoldings((current) => current.filter((row) => row.id !== id));
    };

    const handleAnalyzeRisk = async () => {
        setIsAnalyzing(true);
        setAnalysisError(null);

        try {
            const response = await analyzePortfolioRisk(portfolioPayload, holdingsPayload);
            setAnalysisResult(response.data);
        } catch (error) {
            setAnalysisResult(null);
            setAnalysisError(error instanceof Error ? error.message : 'Unable to analyze portfolio risk.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-lg">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
                                Allocation Input
                            </p>
                            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                                Enter your current asset mix
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                                First choose a major asset class, then select the sub asset class. This keeps the model extensible for deeper portfolio risk analysis.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={addRow}
                            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Add Asset Type
                        </button>
                    </div>

                    <div className="mt-8 space-y-4">
                        {allocations.map((row) => (
                            <div
                                key={row.id}
                                className={`grid gap-3 rounded-3xl border p-4 transition md:grid-cols-[minmax(0,1.05fr)_minmax(0,1.2fr)_140px_110px] ${
                                    selectedSliceId === row.id
                                        ? 'border-emerald-300 bg-emerald-50/60'
                                        : 'border-slate-200 bg-slate-50'
                                }`}
                            >
                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        Major Asset Class
                                    </label>
                                    <select
                                        value={row.assetClass}
                                        onFocus={() => setSelectedSliceId(row.id)}
                                        onChange={(event) => {
                                            const nextAssetClass = event.target.value as AssetClassName;
                                            const firstOption = assetClassConfig[nextAssetClass][0];
                                            updateRow(row.id, {
                                                assetClass: nextAssetClass,
                                                subAssetClass: firstOption.subAssetClass,
                                                color: firstOption.color,
                                            });
                                        }}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                                    >
                                        {assetClassList.map((assetClass) => (
                                            <option key={assetClass} value={assetClass}>
                                                {assetClass}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        Sub Asset Class
                                    </label>
                                    <select
                                        value={row.subAssetClass}
                                        onFocus={() => setSelectedSliceId(row.id)}
                                        onChange={(event) => {
                                            const nextSubAssetClass = event.target.value;
                                            const nextOption = assetClassConfig[row.assetClass].find(
                                                (option) => option.subAssetClass === nextSubAssetClass,
                                            );

                                            updateRow(row.id, {
                                                subAssetClass: nextSubAssetClass,
                                                color: nextOption?.color ?? row.color,
                                            });
                                        }}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                                    >
                                        {assetClassConfig[row.assetClass].map((option) => (
                                            <option key={option.subAssetClass} value={option.subAssetClass}>
                                                {option.subAssetClass}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        Allocation %
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={row.percentage}
                                        onFocus={() => setSelectedSliceId(row.id)}
                                        onChange={(event) =>
                                            updateRow(row.id, {
                                                percentage: clampPercentage(Number(event.target.value)),
                                            })
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                                    />
                                </div>

                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={() => removeRow(row.id)}
                                        disabled={allocations.length === 1}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm leading-6 text-slate-600">
                            Send the current allocation and optional holdings to the risk API to run allocation, macro, and global events analysis.
                        </p>
                        <button
                            type="button"
                            onClick={handleAnalyzeRisk}
                            disabled={isAnalyzing}
                            className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isAnalyzing ? 'Analyzing risk...' : 'Analyze Risk'}
                        </button>
                    </div>

                    <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
                                    Holdings Overlay
                                </p>
                                <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                                    Ticker-based exposure input
                                </h3>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                                    Holdings are optional. They help the news risk layer measure which current event clusters are actually relevant to your portfolio.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={addHolding}
                                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                            >
                                Add Holding
                            </button>
                        </div>

                        <div className="mt-6 space-y-4">
                            {holdings.map((holding) => (
                                <div
                                    key={holding.id}
                                    className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_140px_110px]"
                                >
                                    <div>
                                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                            Ticker
                                        </label>
                                        <input
                                            type="text"
                                            value={holding.ticker}
                                            onChange={(event) =>
                                                updateHolding(holding.id, {
                                                    ticker: event.target.value.toUpperCase(),
                                                })
                                            }
                                            placeholder="AAPL"
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                            Weight %
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={holding.weight}
                                            onChange={(event) =>
                                                updateHolding(holding.id, {
                                                    weight: clampPercentage(Number(event.target.value)),
                                                })
                                            }
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                                        />
                                    </div>

                                    <div className="flex items-end">
                                        <button
                                            type="button"
                                            onClick={() => removeHolding(holding.id)}
                                            disabled={holdings.length === 1}
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                            Current holdings coverage: <span className="font-semibold text-slate-900">{holdingsTotal}%</span> of portfolio entered for event exposure screening.
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
                                    Overview
                                </p>
                                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                                    Interactive allocation view
                                </h2>
                            </div>
                            <div
                                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                                    total === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                }`}
                            >
                                Total {total}%
                            </div>
                        </div>

                        <div className="mt-8 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
                            <div className="flex flex-col items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => selectedSlice && setSelectedSliceId(selectedSlice.id)}
                                    className="relative h-64 w-64 rounded-full border border-slate-200 p-4 shadow-inner transition hover:scale-[1.01]"
                                    style={chartStyle}
                                    aria-label="Asset allocation chart"
                                >
                                    <div className="absolute inset-[22%] flex items-center justify-center rounded-full bg-white/95 shadow-sm">
                                        <div className="text-center">
                                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                                Selected
                                            </p>
                                            <p className="mt-2 text-lg font-semibold text-slate-950">
                                                {selectedSlice?.subAssetClass ?? 'Allocation'}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {selectedSlice?.percentage ?? 0}% of portfolio
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            <div className="space-y-3">
                                {allocations.map((row) => (
                                    <button
                                        key={row.id}
                                        type="button"
                                        onClick={() => setSelectedSliceId(row.id)}
                                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                                            selectedSliceId === row.id
                                                ? 'border-slate-950 bg-slate-950 text-white'
                                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                                        }`}
                                    >
                                        <span className="flex items-center gap-3">
                                            <span
                                                className="h-3 w-3 rounded-full"
                                                style={{ backgroundColor: row.color }}
                                            />
                                            <span>
                                                <span className="block text-sm font-medium">{row.subAssetClass}</span>
                                                <span className="block text-xs text-slate-400">{row.assetClass}</span>
                                            </span>
                                        </span>
                                        <span className="text-sm font-semibold">{row.percentage}%</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-lg">
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
                            Text Summary
                        </p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                            Allocation
                        </h2>
                        <textarea
                            readOnly
                            value={summaryText}
                            className="mt-6 min-h-64 w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 font-mono text-sm leading-7 text-slate-700 outline-none"
                        />
                    </div>
                </section>
            </div>

            <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-lg">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
                            Portfolio Risk Analysis
                        </p>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                            Allocation-based risk analysis
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                            This section now combines the allocation engine with cached macro context and a global events risk layer.
                        </p>
                    </div>
                    {analysisResult && (
                        <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                            Risk Score {analysisResult.riskScore}
                        </div>
                    )}
                </div>

                {!analysisResult && !analysisError && !isAnalyzing && (
                    <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-sm text-slate-500">
                        No analysis yet. Click <span className="font-semibold text-slate-700">Analyze Risk</span> to send the current allocation to the backend.
                    </div>
                )}

                {isAnalyzing && (
                    <div className="mt-8 rounded-3xl border border-emerald-100 bg-emerald-50 px-6 py-8 text-sm text-emerald-700">
                        Running allocation risk analysis...
                    </div>
                )}

                {analysisError && (
                    <div className="mt-8 rounded-3xl border border-rose-100 bg-rose-50 px-6 py-8 text-sm text-rose-700">
                        {analysisError}
                    </div>
                )}

                {analysisResult && (
                    <div className="mt-8 space-y-6">
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    Overall Risk Score
                                </p>
                                <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                                    {analysisResult.riskScore}
                                </p>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    Market Regime
                                </p>
                                <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                                    {analysisResult.marketRegime}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-1">
                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    News Risk Score
                                </p>
                                <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                                    {analysisResult.newsRisk}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Macro Environment
                            </p>
                            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Interest Rate</p>
                                    <p className="mt-3 text-2xl font-semibold text-slate-950">{analysisResult.macroEnvironment.interestRate.toFixed(2)}%</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">10Y Yield</p>
                                    <p className="mt-3 text-2xl font-semibold text-slate-950">{analysisResult.macroEnvironment.tenYearYield.toFixed(2)}%</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inflation Trend</p>
                                    <p className="mt-3 text-2xl font-semibold capitalize text-slate-950">{analysisResult.macroEnvironment.inflationTrend}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Unemployment</p>
                                    <p className="mt-3 text-2xl font-semibold text-slate-950">{analysisResult.macroEnvironment.unemploymentRate.toFixed(1)}%</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Volatility</p>
                                    <p className="mt-3 text-2xl font-semibold text-slate-950">{analysisResult.macroEnvironment.marketVolatility.toFixed(1)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-6">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        Global Events Risk
                                    </p>
                                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                                        Recent risk events
                                    </h3>
                                </div>
                                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                                    News Risk {analysisResult.newsRisk}
                                </div>
                            </div>

                            {analysisResult.recentEvents.length === 0 ? (
                                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                                    No recent global events passed the recency, confidence, and portfolio-relevance filters.
                                </div>
                            ) : (
                                <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
                                    <div className="grid grid-cols-[1.4fr_130px_1fr_130px] bg-slate-950 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                                        <span>Event Type</span>
                                        <span>Severity</span>
                                        <span>Affected Assets</span>
                                        <span>Exposure</span>
                                    </div>
                                    <div className="divide-y divide-slate-200 bg-white">
                                        {analysisResult.recentEvents.map((event) => (
                                            <a
                                                key={`${event.title}-${event.timestamp}`}
                                                href={event.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="grid grid-cols-[1.4fr_130px_1fr_130px] items-center px-5 py-4 text-sm text-slate-700 transition hover:bg-slate-50"
                                            >
                                                <div>
                                                    <p className="font-semibold capitalize text-slate-950">
                                                        {event.eventType}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {event.title} · {event.source}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                                                        event.severity === 'high'
                                                            ? 'bg-rose-100 text-rose-700'
                                                            : event.severity === 'medium'
                                                                ? 'bg-amber-100 text-amber-700'
                                                                : 'bg-emerald-100 text-emerald-700'
                                                    }`}
                                                >
                                                    {event.severity}
                                                </span>
                                                <div className="text-xs leading-6 text-slate-600">
                                                    {event.affectedAssets.join(', ')}
                                                </div>
                                                <span className="text-sm font-semibold text-slate-950">
                                                    {event.portfolioExposure}%
                                                </span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Risk Breakdown
                            </p>
                            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                                {Object.entries(analysisResult.riskBreakdown).map(([key, value]) => (
                                    <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                            {riskBreakdownLabels[key as keyof PortfolioRiskAnalysisResult['riskBreakdown']]}
                                        </p>
                                        <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-2">
                            <div className="rounded-3xl border border-slate-200 bg-white p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    Top Risks
                                </p>
                                <ul className="mt-5 space-y-3">
                                    {analysisResult.topRisks.map((risk) => (
                                        <li key={risk} className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
                                            {risk}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    Recommendations
                                </p>
                                <ul className="mt-5 space-y-3">
                                    {analysisResult.recommendations.map((recommendation) => (
                                        <li key={recommendation} className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                            {recommendation}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Summary
                            </p>
                            <p className="mt-4 text-sm leading-7 text-slate-700">
                                {analysisResult.summary}
                            </p>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
