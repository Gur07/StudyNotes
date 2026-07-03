import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/index';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser]       = useState(null);
    const [loading, setLoading] = useState(true);

    // on app load — check if cookie session is still valid
    useEffect(() => {
        authAPI.getMe()
            .then(res => setUser(res.data.user))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const register = async (username, email, password) => {
        const res = await authAPI.register({ username, email, password });
        setUser(res.data.user);
        return res.data;
    };

    const login = async (email, password) => {
        const res = await authAPI.login({ email, password });
        setUser(res.data.user);
        return res.data;
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } finally {
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, register, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}