import AuthForm from '../components/AuthForm';
import { Link } from 'react-router-dom';

export default function Login() {
    return (
        <main className="min-h-screen bg-background px-4 py-6 text-on-background md:px-6 lg:px-8">
            <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-outline/50 bg-surface shadow-[0_30px_100px_rgba(0,0,0,0.08)] lg:grid-cols-[1.05fr_0.95fr]">
                <section className="relative hidden overflow-hidden bg-[linear-gradient(145deg,#2c160d_0%,#5c2f16_45%,#1f120d_100%)] p-8 text-white lg:flex lg:flex-col lg:justify-between">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(247,185,140,0.35),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_22%)]" />
                    <div className="relative flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#ffd6bf] backdrop-blur-sm">
                            <span className="material-symbols-outlined text-[22px]">auto_stories</span>
                        </span>
                        <div>
                            <p className="font-headline-md text-2xl font-semibold text-[#ffd9c8]">ScholarNotes</p>
                            <p className="font-ui-small text-ui-small text-white/70">Illuminated scholarship</p>
                        </div>
                    </div>

                    <div className="relative max-w-xl space-y-6">
                        <h1 className="font-display-lg text-[clamp(3rem,6vw,4.75rem)] leading-[0.95] tracking-tight text-[#fff3ea]">
                            Deep work,
                            <span className="block text-[#f7b98c]">simplified.</span>
                        </h1>
                        <p className="max-w-lg font-body-lg text-[1.05rem] leading-8 text-white/75">
                            A focused workspace for generating structured notes from topics or source files, with secure sessions and clean exports.
                        </p>

                        <div className="grid max-w-lg gap-3 sm:grid-cols-3">
                            {['Secure cookie auth', 'PDF-backed notes', 'Markdown export'].map(item => (
                                <div key={item} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-white/85 backdrop-blur-sm">
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
                    <div className="w-full max-w-md space-y-8">
                        <div className="flex items-center gap-3 lg:hidden">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/15">
                                <span className="material-symbols-outlined text-[22px]">auto_stories</span>
                            </span>
                            <div>
                                <p className="font-headline-md text-2xl font-semibold text-on-surface">ScholarNotes</p>
                                <p className="font-ui-small text-ui-small text-on-surface-variant">Illuminated scholarship</p>
                            </div>
                        </div>

                        <header className="space-y-3">
                            <p className="font-ui-small text-ui-small uppercase tracking-[0.2em] text-on-surface-variant">Sign in</p>
                            <h2 className="font-headline-lg text-4xl leading-tight text-on-surface">Welcome back</h2>
                            <p className="max-w-sm font-body-md text-body-md leading-7 text-on-surface-variant">
                                Enter your email and password to access your workspace.
                            </p>
                        </header>

                        <AuthForm mode="login" />

                        <p className="border-t border-outline/60 pt-5 text-center font-body-md text-body-md text-on-surface-variant">
                            Don’t have an account?{' '}
                            <Link className="font-semibold text-primary hover:underline" to="/signup">
                                Create your workspace
                            </Link>
                        </p>
                    </div>
                </section>
            </div>
        </main>
    );
}