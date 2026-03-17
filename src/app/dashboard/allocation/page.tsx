import DashboardLayout from '@/components/DashboardLayout';
import AssetAllocationWorkbench from '@/components/AssetAllocationWorkbench';

export default function AllocationPage() {
    return (
        <DashboardLayout>
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white/90 px-8 py-8 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
                        Allocation Studio
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                        Map your current asset allocation
                    </h1>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                        Enter your existing asset categories and percentages, review the mix as text,
                        and explore the balance through an interactive visualization.
                    </p>
                </div>

                <AssetAllocationWorkbench />
            </div>
        </DashboardLayout>
    );
}
