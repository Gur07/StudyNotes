import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function Dashboard() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="flex min-h-screen w-full overflow-hidden bg-background text-on-background">
            <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

            <main className="flex min-w-0 flex-1 flex-col">
                <header className="border-b border-outline/40 bg-surface/75 px-4 py-4 backdrop-blur md:hidden">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="font-headline-md text-xl font-semibold text-on-surface">ScholarNotes</p>
                            <p className="font-ui-small text-ui-small text-on-surface-variant">Research workspace</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-outline/60 bg-surface text-on-surface"
                            aria-label="Open navigation"
                        >
                            <span className="material-symbols-outlined text-[22px]">menu</span>
                        </button>
                    </div>
                </header>

                <div className="min-h-0 flex-1 overflow-hidden">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}