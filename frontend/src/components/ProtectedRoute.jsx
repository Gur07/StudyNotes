import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="glass-panel rounded-2xl border border-outline/40 px-6 py-5 text-center shadow-[0_20px_80px_rgba(0,0,0,0.08)]">
                    <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                    <p className="mt-3 font-ui-label text-ui-label text-on-surface-variant">Checking your session...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}