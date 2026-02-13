import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';

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
            // Determine if input is email or username
            // If username (no @), append domain or treat as username for custom auth
            let emailToUse = emailInput;
            if (!emailInput.includes('@')) {
                emailToUse = `${emailInput}@valtrack.com`;
            }

            const { data, error: authError } = await login(emailToUse, password);

            if (authError) {
                console.error('Login error:', authError);
                // Try with raw username if the email construction failed?
                // The custom auth in AuthContext checks email field.
                // If the user profile has "admin" as username but "admin@valtrack.com" as email,
                // and they type "admin", emailToUse becomes "admin@valtrack.com".
                // This matches the email field. Checks out.
                setError('Invalid credentials or inactive account.');
            } else {
                // Success is handled by useEffect on isAuthenticated
            }

        } catch (err) {
            console.error('Unexpected login error:', err);
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex" style={{ backgroundColor: '#F8FAFC' }}>
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden">
                {/* Background Image & Overlay */}
                <div
                    className="absolute inset-0 z-0"
                    style={{
                        backgroundImage: 'url(/images/login-bg.jpg)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                <div className="absolute inset-0 z-0" style={{ backgroundColor: 'rgba(0, 16, 74, 0.85)' }} />

                <div className="max-w-md text-center relative z-10">
                    <div className="mb-8 flex justify-center">
                        <img
                            src="images/valtrack-logo.png"
                            alt="Val-Track Logo"
                            className="w-64 h-64 rounded-full object-cover border-4 border-white/20 shadow-2xl"
                        />
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <img
                                src="images/valtrack-logo.png"
                                alt="Val-Track Logo"
                                className="w-40 h-40 rounded-full object-cover border-4 border-[#00104A]/10 shadow-lg"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                        <div className="text-center mb-8">
                            <div
                                className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4"
                                style={{ backgroundColor: 'rgba(0, 16, 74, 0.05)' }}
                            >
                                <Shield className="w-7 h-7" style={{ color: '#00104A' }} />
                            </div>
                            <h2 className="text-2xl font-bold" style={{ color: '#232323' }}>Welcome Back</h2>
                            <p className="text-gray-500 mt-1">Sign in to continue</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            {error && (
                                <div
                                    className="p-4 rounded-lg text-sm flex items-center gap-2"
                                    style={{ backgroundColor: 'rgba(255, 43, 43, 0.1)', color: '#FF2B2B' }}
                                >
                                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: '#232323' }}>
                                    Username or Email
                                </label>
                                <input
                                    type="text"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-400 transition-all"
                                    style={{ color: '#232323' }}
                                    placeholder="Enter your username or email"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: '#232323' }}>
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-400 transition-all pr-12"
                                        style={{ color: '#232323' }}
                                        placeholder="Enter your password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 hover:opacity-90"
                                style={{ backgroundColor: '#FF2B2B' }}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>


                    </div>

                    <p className="text-center text-gray-400 text-xs mt-6">
                        © 2026 Valenzuela City Library. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}