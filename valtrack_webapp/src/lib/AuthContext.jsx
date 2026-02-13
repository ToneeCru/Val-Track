import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Auth User or Custom User object
    const [profile, setProfile] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        // 1. Check existing session (local storage for custom auth, or Supabase session)
        checkUser();

        // 2. Listen for Supabase auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    await handleSupabaseUser(session.user);
                }
            } else if (event === 'SIGNED_OUT') {
                // Only clear if we were using Supabase Auth. 
                // If we are using Custom Auth, this event might fire unexpectedly? 
                // No, usually only if we call signOut.
                // We'll handle logout explicitly.
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const checkUser = async () => {
        setIsLoading(true);
        try {
            // A. Check Local Storage (for our Custom Auth persistence)
            const storedSession = localStorage.getItem('valtrack_session');
            if (storedSession) {
                const parsed = JSON.parse(storedSession);
                // Verify against profiles table to ensure still active/valid?
                // For speed, we just trust local storage on load, but ideally verify.
                // Let's verify.
                if (parsed.email) {
                    const profileData = await getProfileByEmail(parsed.email);
                    if (profileData && profileData.status === 'active') {
                        setProfile(profileData);
                        setUser({
                            id: profileData.id,
                            email: profileData.email,
                            user_metadata: { full_name: profileData.full_name }
                        });
                        setIsAuthenticated(true);
                        setIsLoading(false);
                        return;
                    }
                }
            }

            // B. Check Supabase Auth Session (if A fails or no local storage)
            const { data: { session }, error } = await supabase.auth.getSession();
            if (session?.user) {
                await handleSupabaseUser(session.user);
            } else {
                // No session
                setUser(null);
                setProfile(null);
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Auth check error:', error);
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSupabaseUser = async (authUser) => {
        setUser(authUser);
        setIsAuthenticated(true);
        const profileData = await getProfileByEmail(authUser.email);
        if (profileData) {
            setProfile(profileData);
            // Sync local storage for consistency
            localStorage.setItem('valtrack_session', JSON.stringify({
                name: profileData.full_name,
                role: profileData.role,
                title: profileData.title,
                email: profileData.email,
                assigned_branch_id: profileData.assigned_branch_id,
                assigned_floor_id: profileData.assigned_floor_id,
                assigned_area_id: profileData.assigned_area_id,
                permissions: profileData.permissions,
                id: profileData.id
            }));
        }
    };

    const getProfileByEmail = async (email) => {
        if (!email) return null;
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();
        if (error) return null;
        return data;
    };

    const login = async (email, password) => {
        setIsLoading(true);
        setAuthError(null);
        try {
            // 1. Try Supabase Auth First
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (!error && data.user) {
                await handleSupabaseUser(data.user);
                return { data, error: null };
            }

            // 2. Fallback to Custom Auth (checking profiles table)
            // Note: This is less secure but necessary since admin cannot create Auth Users easily from client.
            console.log('Supabase Auth failed, trying Custom Profile Auth...');

            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
                .eq('password', password) // Validating plaintext password (legacy support)
                .eq('status', 'active')
                .single();

            if (profileError || !profileData) {
                throw new Error('Invalid login credentials or inactive account.');
            }

            // Success via Custom Auth
            setProfile(profileData);
            const customUser = {
                id: profileData.id,
                email: profileData.email,
                user_metadata: { full_name: profileData.full_name }
            };
            setUser(customUser);
            setIsAuthenticated(true);

            localStorage.setItem('valtrack_session', JSON.stringify({
                name: profileData.full_name,
                role: profileData.role,
                title: profileData.title,
                email: profileData.email,
                assigned_branch_id: profileData.assigned_branch_id,
                assigned_floor_id: profileData.assigned_floor_id,
                assigned_area_id: profileData.assigned_area_id,
                permissions: profileData.permissions,
                id: profileData.id
            }));

            return { data: { user: customUser }, error: null };

        } catch (error) {
            setAuthError(error.message);
            return { data: null, error };
        } finally {
            setIsLoading(false);
        }
    };

    const refreshProfile = async () => {
        if (!user?.email) return;
        const profileData = await getProfileByEmail(user.email);
        if (profileData) {
            setProfile(profileData);
            // Update local storage to keep it in sync
            localStorage.setItem('valtrack_session', JSON.stringify({
                name: profileData.full_name,
                role: profileData.role,
                title: profileData.title,
                email: profileData.email,
                assigned_branch_id: profileData.assigned_branch_id,
                assigned_floor_id: profileData.assigned_floor_id,
                assigned_area_id: profileData.assigned_area_id,
                permissions: profileData.permissions,
                id: profileData.id
            }));
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.error('Supabase signout notice:', e);
        }
        setProfile(null);
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('valtrack_session');
        window.location.href = '/Home';
    };

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            isAuthenticated,
            isLoading,
            authError,
            login,
            logout,
            refreshProfile // Expose this
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
