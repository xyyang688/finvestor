import AuthForm from "@/components/AuthForm";

export default function LoginPage(){
    return (
        <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_45%,#ffffff_100%)] px-6 py-12 text-slate-900">
            <div className="mx-auto grid min-h-[80vh] max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="space-y-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
                        Finvestor AI
                    </p>
                    <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
                        Investment guidance that feels clear, personal, and actionable.
                    </h1>
                    <p className="max-w-2xl text-base leading-7 text-slate-600">
                        Sign in with a secure magic link to generate AI-assisted portfolio ideas,
                        compare previous recommendations, and keep your planning history in one place.
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
                            <p className="text-sm font-semibold text-slate-900">Fast profile capture</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Enter your age, risk profile, goal, and time horizon in a single flow.
                            </p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
                            <p className="text-sm font-semibold text-slate-900">Recommendation history</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Review your latest recommendation and compare it with earlier portfolio ideas.
                            </p>
                        </div>
                    </div>
                </section>

                <AuthForm />
            </div>
        </main>
    )
}
