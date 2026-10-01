import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import { authService, AuthUser } from './authService';

type AuthContextValue = {
    user: AuthUser | null;
    loading: boolean;
    isOfflineSession: boolean;
    login: (
        email: string,
        password: string,
        allowOffline?: boolean
    ) => Promise<AuthUser>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOfflineSession, setIsOfflineSession] = useState(false);

    const syncOfflineFlag = useCallback(async () => {
        setIsOfflineSession(await authService.isOfflineSession());
    }, []);

    // Auto-carga al arrancar
    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const cached = await authService.getStoredUser();
                if (cached && mounted) setUser(cached);

                const fresh = await authService.me();
                if (!mounted) return;

                if (fresh) {
                    setUser(fresh);
                    await syncOfflineFlag();
                } else {
                    setUser(null);
                    setIsOfflineSession(false);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [syncOfflineFlag]);

    const login = useCallback(
        async (email: string, password: string, allowOffline = true) => {
            const u = await authService.login(email, password, allowOffline);
            await syncOfflineFlag();
            setUser(u);
            return u;
        },
        [syncOfflineFlag]
    );

    const logout = useCallback(async () => {
        await authService.logout();
        setIsOfflineSession(false);
        setUser(null);
    }, []);

    const refresh = useCallback(async () => {
        const fresh = await authService.me();
        if (fresh) {
            setUser(fresh);
            await syncOfflineFlag();
        } else {
            setUser(null);
            setIsOfflineSession(false);
        }
    }, [syncOfflineFlag]);

    return (
        <AuthContext.Provider
            value={{ user, loading, isOfflineSession, login, logout, refresh }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
    return ctx;
};