import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AuthForm({ mode }) {
    const isLogin = mode === 'login';
    const { login, register } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({ username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                await login(form.email, form.password);
            } else {
                await register(form.username, form.email, form.password);
            }
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="space-y-5" onSubmit={handleSubmit}>

            {!isLogin && (
                <div className="space-y-2">
                    <label className="block font-ui-label text-ui-label text-on-surface" htmlFor="username">
                        Username
                    </label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline transition-colors group-focus-within:text-primary">
                            person
                        </span>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            required
                            autoComplete="username"
                            placeholder="yourname"
                            value={form.username}
                            onChange={handleChange}
                            className="w-full rounded-2xl border border-outline/70 bg-surface-container-lowest py-3 pl-12 pr-4 text-on-surface outline-none transition focus:border-primary focus:bg-surface focus-ring"
                        />
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <label className="block font-ui-label text-ui-label text-on-surface" htmlFor="email">
                    Email Address
                </label>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline transition-colors group-focus-within:text-primary">
                        mail
                    </span>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="name@university.edu"
                        value={form.email}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-outline/70 bg-surface-container-lowest py-3 pl-12 pr-4 text-on-surface outline-none transition focus:border-primary focus:bg-surface focus-ring"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="block font-ui-label text-ui-label text-on-surface" htmlFor="password">
                    Password
                </label>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline transition-colors group-focus-within:text-primary">
                        lock
                    </span>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                        placeholder="••••••••"
                        value={form.password}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-outline/70 bg-surface-container-lowest py-3 pl-12 pr-4 text-on-surface outline-none transition focus:border-primary focus:bg-surface focus-ring"
                    />
                </div>
            </div>

            {error && (
                <div role="alert" className="rounded-2xl border border-error/20 bg-error-container px-4 py-3">
                    <p className="font-ui-small text-ui-small text-on-error-container">{error}</p>
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-ui-button text-ui-button text-on-primary shadow-lg shadow-primary/15 transition hover:bg-[#b54e1a] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Workspace'}
            </button>
        </form>
    );
}