import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
    const navigate = useNavigate();
    const { login, isAuthenticated, user, profile } = useAuth();

    const [emailInput, setEmailInput] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated && profile) {
            toast.success(`Welcome back, ${profile.full_name || 'User'}`);
            switch (profile.role) {
                case 'admin':
                    navigate('/AdminDashboard');
                    break;
                case 'staff':
                    navigate('/StaffDashboard');
                    break;
                case 'volunteer':
                    navigate('/VolunteerDashboard');
                    break;
                default:
                    navigate('/Home');
            }
        }
    }, [isAuthenticated, profile, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // First try with raw input (supports patron library_id login)
            let emailToUse = emailInput;

            let { data, error: authError } = await login(emailToUse, password);

            // If raw input failed and it doesn't contain @, try with @valtrack.com suffix
            if (authError && !emailInput.includes('@')) {
                emailToUse = `${emailInput}@valtrack.com`;
                const result = await login(emailToUse, password);
                data = result.data;
                authError = result.error;
            }

            if (authError) {
                console.error('Login error:', authError);
                setError('Invalid credentials or inactive account.');
            }

        } catch (err) {
            console.error('Unexpected login error:', err);
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-[100vh] w-full relative flex flex-col items-center overflow-y-auto bg-[#00104A] custom-scrollbar">
            {/* Full Screen Background with Parallax-like feel */}
            <motion.div
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: 'url(/login-bg.jpg)',
                    filter: 'brightness(0.6)'
                }}
            />

            {/* Premium Gradient Overlay */}
            <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#00104A]/90 via-[#00104A]/70 to-[#000]/60 backdrop-blur-sm" />

            {/* Content Container */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md px-6 my-auto py-10 flex flex-col items-center"
            >

                {/* Logo Section */}
                <div className="text-center mb-10 flex flex-col items-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                        className="relative mb-6 group"
                    >
                        <div className="absolute -inset-2 bg-gradient-to-r from-[#56CBF9] to-blue-600 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-500 animate-pulse"></div>
                        <img
                            src="/valtrack-logo.png"
                            alt="Val-Track Logo"
                            className="relative w-28 h-28 rounded-full object-cover border-[3px] border-white/20 shadow-2xl"
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-xl mb-2">
                            Val-Track
                        </h1>
                        <p className="text-[#56CBF9] font-medium text-xs tracking-[0.2em] uppercase opacity-90">
                            Patron Management System
                        </p>
                    </motion.div>
                </div>

                {/* Login Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] p-8 sm:p-10"
                >
                    <div className="mb-8 text-center">
                        <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                        <p className="text-blue-200/80 text-sm">Sign in to continue to your dashboard</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 overflow-hidden"
                                >
                                    <Shield className="w-5 h-5 text-red-400 flex-shrink-0" />
                                    <span className="text-sm text-red-200 font-medium">{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-blue-100/80 uppercase tracking-wider ml-1">
                                    Library ID / Email
                                </label>
                                <motion.div whileFocus={{ scale: 1.01 }}>
                                    <input
                                        type="text"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#56CBF9]/50 focus:bg-black/30 transition-all shadow-inner"
                                        placeholder="Enter your specific ID"
                                        required
                                    />
                                </motion.div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-blue-100/80 uppercase tracking-wider ml-1">
                                    Password
                                </label>
                                <motion.div className="relative" whileFocus={{ scale: 1.01 }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#56CBF9]/50 focus:bg-black/30 transition-all shadow-inner pr-12"
                                        placeholder="Enter your password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </motion.div>
                                <div className="text-right">
                                    <span className="text-xs text-white/30 italic">Format: YYYY-MM-DD</span>
                                </div>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 mt-4 rounded-xl font-bold text-white text-base shadow-xl shadow-blue-900/20 bg-gradient-to-r from-blue-700 via-blue-600 to-[#56CBF9] hover:contrast-125 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                'Sign In'
                            )}
                        </motion.button>
                    </form>
                </motion.div>

                <div className="mt-8 text-center">
                    <p className="text-white/30 text-xs font-medium tracking-wide">
                        © 2026 Valenzuela City Library • Val-Track v2.5
                    </p>
                </div>
            </motion.div>
        </div>
    );
}