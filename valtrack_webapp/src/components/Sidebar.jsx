import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../lib/AuthContext';
import ProfileSettingsModal from './ProfileSettingsModal';
import {
    LayoutDashboard,
    Users,
    Grid3X3,
    BarChart3,
    FileText,
    QrCode,
    Package,
    ListChecks,
    AlertTriangle,
    LogOut,
    Building2,
    ChevronRight,
    Map,
    ChevronDown,
    Check,
    History
} from 'lucide-react';

const adminMenuItems = [
    { key: 'dashboard', path: '/AdminDashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'user_management', path: '/AdminUserManagement', label: 'User Management', icon: Users },
    { key: 'baggage', path: '/AdminBaggageManagement', label: 'Baggage Management', icon: Package },
    { key: 'admin_active_baggage', path: '/AdminActiveBaggage', label: 'Active Baggage', icon: Package },
    { key: 'baggage_logs', path: '/AdminBaggageLogs', label: 'Baggage Logs', icon: History },
    { key: 'branch_management', path: '/AdminBranchManagement', label: 'Branch Management', icon: Building2 },
    { key: 'area_management', path: '/AdminAreaManagement', label: 'Area Management', icon: Map },
    { key: 'incidents', path: '/AdminIncidents', label: 'Incident & Exception', icon: AlertTriangle },
    { key: 'reports', path: '/AdminReports', label: 'Analytics', icon: BarChart3 },
    { key: 'audit_logs', path: '/AdminAuditLogs', label: 'Audit Logs', icon: FileText },
];

const staffMenuItems = [
    { key: 'dashboard', path: '/StaffDashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'qr_scan', path: '/StaffQRScan', label: 'Patron QR Scan', icon: QrCode },
    { key: 'baggage', path: '/StaffBaggage', label: 'Baggage Module', icon: Package },
    { key: 'baggage', path: '/StaffActiveBaggage', label: 'Active Baggage', icon: ListChecks },
    { key: 'incidents', path: '/StaffIncidents', label: 'Incident & Exception', icon: AlertTriangle },
];

const volunteerMenuItems = [
    { key: 'dashboard', path: '/VolunteerDashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'qr_scan', path: '/VolunteerQRScan', label: 'Patron QR Scan', icon: QrCode },
    { key: 'baggage', path: '/VolunteerBaggage', label: 'Baggage Module', icon: Package },
    { key: 'baggage', path: '/VolunteerActiveBaggage', label: 'Active Baggage', icon: ListChecks },
];

export default function Sidebar({ role }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { selectedBranch, branches, changeBranch, loading: loadingBranches } = useBranch();
    const { logout, profile } = useAuth();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsBranchDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const userDisplay = profile || { name: 'User', avatar_url: null, role: role, title: role };

    // Filter Menu Items based on Permissions
    let menuItems = [];
    let roleLabel = '';

    if (role === 'admin') {
        menuItems = adminMenuItems;
        roleLabel = 'Administrator';
    } else {
        const baseItems = role === 'staff' ? staffMenuItems : volunteerMenuItems;
        // Check permissions or default to all active if legacy/undefined
        const permissions = profile?.permissions || {};

        // Logic: 
        // 1. If 'all' is true, show everything appropriate for base role
        // 2. Else check individual keys
        const hasAll = permissions.all === true;

        menuItems = baseItems.filter(item => hasAll || permissions[item.key] === true);

        roleLabel = profile?.title || (role === 'staff' ? 'Library Staff' : 'Student Volunteer');
    }

    const handleLogout = async () => {
        await logout();
        navigate('/Home');
    };

    const handleBranchSelect = (branchId) => {
        changeBranch(branchId);
        setIsBranchDropdownOpen(false);
    }

    return (
        <aside
            className="fixed left-0 top-0 h-screen w-64 flex flex-col z-40 overflow-hidden shadow-2xl"
            style={{ backgroundColor: '#00104A' }}
        >
            {/* Background Image & Overlay */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: 'url(/login-bg.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            <div className="absolute inset-0 z-0" style={{ backgroundColor: 'rgba(0, 16, 74, 0.95)' }} />

            <div className="flex flex-col h-full relative z-10">
                {/* Logo */}
                <div className="p-6 border-b border-white/10 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-0.5 flex items-center justify-center shadow-inner border border-white/10">
                            <img src="/valtrack-logo-icon.png" alt="Val-Track" className="w-full h-full object-cover rounded-[10px]" />
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg leading-tight">Val-Track</h1>
                            <p className="text-[10px] font-medium tracking-wider uppercase opacity-80" style={{ color: '#56CBF9' }}>Patron System</p>
                        </div>
                    </div>
                </div>

                {/* User Profile */}
                <div className={`px-4 py-4 border-b border-white/10`}>
                    <div
                        onClick={() => role === 'admin' && setIsProfileModalOpen(true)}
                        className={`flex items-center gap-3 px-2 w-full rounded-xl transition-all p-2 text-left border border-transparent ${role === 'admin' ? 'hover:bg-white/5 hover:border-white/5 cursor-pointer group' : ''}`}
                    >
                        <div className="relative">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden border-2 border-white/10 transition-colors ${role === 'admin' ? 'group-hover:border-[#56CBF9]/50' : ''}`} style={{ backgroundColor: 'rgba(86, 203, 249, 0.1)' }}>
                                {userDisplay.avatar_url ? <img src={userDisplay.avatar_url} className="w-full h-full object-cover" /> : (userDisplay.name || userDisplay.full_name)?.charAt(0) || 'U'}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#00104A]"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-white text-sm font-medium truncate transition-colors ${role === 'admin' ? 'group-hover:text-[#56CBF9]' : ''}`}>{userDisplay.name || userDisplay.full_name}</p>
                            <p className={`text-xs truncate text-gray-400 transition-colors ${role === 'admin' ? 'group-hover:text-gray-300' : ''}`}>{roleLabel}</p>
                        </div>
                        {role === 'admin' && <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-[#56CBF9] transition-colors" />}
                    </div>

                    {/* Assignment Scope Badge (Non-Admin) */}
                    {role !== 'admin' && selectedBranch && (
                        <div className="mt-2 px-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-blue-200 bg-blue-900/30 px-2 py-1.5 rounded border border-blue-500/20">
                                <Building2 className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate font-medium">Assigned to: {selectedBranch.name}</span>
                            </div>
                        </div>
                    )}
                </div>



                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
                    <div className="space-y-1">
                        {menuItems.map((item, index) => {
                            const isActive = location.pathname === item.path;
                            const Icon = item.icon || LayoutDashboard;
                            return (
                                <Link key={item.path || index} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive ? 'text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5 hover:shadow-md'}`}>
                                    {isActive && <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-[#56CBF9] via-blue-500 to-blue-600" />}
                                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#56CBF9] rounded-r-full shadow-[0_0_12px_#56CBF9]" />}
                                    <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110 text-[#56CBF9]' : 'group-hover:scale-110 group-hover:text-gray-300'}`} />
                                    <span className={`text-sm font-medium flex-1 transition-colors ${isActive ? 'text-white tracking-wide' : ''}`}>{item.label}</span>
                                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#56CBF9] animate-pulse" />}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-white/10 bg-[#000d3d]/30 backdrop-blur-sm">
                    <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-all group">
                        <LogOut className="w-5 h-5 group-hover:text-red-400 transition-colors" />
                        <span className="text-sm font-medium group-hover:text-red-100">Sign Out</span>
                    </button>
                    <div className="mt-4 text-center">
                        <p className="text-[10px] text-gray-600 font-medium tracking-wide">v2.5.0 • Val-Track System</p>
                    </div>
                </div>

                <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
            </div>
        </aside>
    );
}