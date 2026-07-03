import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { to: '/dashboard/new', icon: 'edit_square', label: 'New Note' },
    { to: '/dashboard/history', icon: 'history', label: 'History' },
];

export default function Sidebar({ mobileOpen = false, onClose }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const linkClass = ({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-4 py-3 font-ui-label text-ui-label transition-all outline-none ${isActive
            ? 'bg-primary text-on-primary shadow-lg shadow-primary/15'
            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
        }`;

    return (
        <>
            {mobileOpen && (
                <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={onClose}
                    className="fixed inset-0 z-30 bg-black/35 backdrop-blur-[2px] md:hidden"
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-40 w-[18rem] border-r border-outline/60 bg-surface/95 px-4 py-5 shadow-2xl shadow-black/10 transition-transform duration-300 md:static md:z-auto md:flex md:w-72 md:flex-col md:shadow-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="flex items-start justify-between gap-4 md:block">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/15">
                                <span className="material-symbols-outlined text-[22px]">auto_stories</span>
                            </span>
                            <div>
                                <p className="font-headline-md text-xl font-semibold text-on-surface">ScholarNotes</p>
                                <p className="font-ui-small text-ui-small text-on-surface-variant">Research workspace</p>
                            </div>
                        </div>

                        <p className="mt-5 max-w-xs font-body-md text-body-md leading-relaxed text-on-surface-variant">
                            Create notes from a topic or PDF reference, track generation, and export the result when it is ready.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high md:hidden"
                        aria-label="Close menu"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <nav className="mt-8 flex flex-col gap-2">
                    {navItems.map(item => (
                        <NavLink key={item.to} to={item.to} className={linkClass} onClick={onClose}>
                            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="mt-auto pt-6">
                    <div className="rounded-2xl border border-outline/50 bg-surface-container-low p-4">
                        <p className="font-ui-small text-ui-small uppercase tracking-[0.18em] text-on-surface-variant">
                            Signed in
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-on-primary-container">
                                {user?.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate font-ui-label text-ui-label text-on-surface">{user?.username || 'User'}</p>
                                <p className="truncate font-ui-small text-ui-small text-on-surface-variant">{user?.email}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-outline/60 px-4 py-3 font-ui-button text-ui-button text-on-surface hover:bg-surface-container-high"
                        >
                            <span className="material-symbols-outlined text-[18px]">logout</span>
                            Logout
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}