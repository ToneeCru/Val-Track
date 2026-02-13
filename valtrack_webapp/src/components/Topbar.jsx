import React from 'react';
import { Bell, Search, Calendar, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, User, Megaphone } from 'lucide-react';
import ProfileSettingsModal from './ProfileSettingsModal';
import Modal from './Modal';
import { supabase } from '../lib/supabase';
import moment from 'moment';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';

export default function Topbar({ title, subtitle }) {
    const { profile, user } = useAuth();
    const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
    const [isNotifOpen, setIsNotifOpen] = React.useState(false);
    const [isAllActivityModalOpen, setIsAllActivityModalOpen] = React.useState(false);
    const [notifications, setNotifications] = React.useState([]);
    const [allActivities, setAllActivities] = React.useState([]);
    const notifRef = React.useRef(null);

    // Derived session-like object for compatibility with existing logic
    const session = profile || {
        role: 'guest',
        id: user?.id,
        name: user?.email,
        avatar_url: null
    };

    React.useEffect(() => {
        if (!session.id) return;

        const fetchNotifications = async () => {
            if (session.role === 'admin') {
                const { data } = await supabase
                    .from('audit_logs')
                    .select('*')
                    .order('timestamp', { ascending: false })
                    .limit(5);
                setNotifications(data || []);
            } else {
                const { data } = await supabase
                    .from('announcements')
                    .select('*')
                    .eq('is_active', true)
                    .or(`target_audience.eq.all,target_audience.eq.${session.role},target_user_id.eq.${session.id}`)
                    .lte('scheduled_at', new Date().toISOString())
                    .order('scheduled_at', { ascending: false })
                    .limit(5);
                setNotifications(data || []);
            }
        };

        fetchNotifications();

        // Real-time subscription
        const channel = supabase
            .channel('system_updates')
            .on('postgres_changes', { event: 'INSERT', table: session.role === 'admin' ? 'audit_logs' : 'announcements' }, (payload) => {
                if (session.role !== 'admin') {
                    const isForMe = payload.new.target_audience === 'all' ||
                        payload.new.target_audience === session.role ||
                        payload.new.target_user_id === session.id;
                    const isLive = new Date(payload.new.scheduled_at) <= new Date();
                    if (isForMe && isLive) {
                        setNotifications(prev => [payload.new, ...prev.slice(0, 4)]);
                    }
                } else {
                    setNotifications(prev => [payload.new, ...prev.slice(0, 4)]);
                }
            })
            .subscribe();

        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setIsNotifOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            supabase.removeChannel(channel);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [session.id, session.role]);

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const getIcon = (action) => {
        if (!action) return <User className="w-4 h-4 text-blue-500" />;
        if (action.includes('Check-In')) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
        if (action.includes('Check-Out')) return <ArrowDownRight className="w-4 h-4 text-gray-500" />;
        if (action.includes('Baggage')) return <Package className="w-4 h-4 text-amber-500" />;
        if (action.includes('Incident')) return <AlertTriangle className="w-4 h-4 text-red-500" />;
        return <User className="w-4 h-4 text-blue-500" />;
    };

    return (
        <header className="bg-white border-b border-gray-100 px-8 py-4 sticky top-0 z-50">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: '#232323' }}>{title}</h1>
                    {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">{currentDate}</span>
                    </div>

                    <div className="h-8 w-px bg-gray-200" />

                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setIsNotifOpen(!isNotifOpen)}
                            className={`relative p-2.5 rounded-xl transition-all ${isNotifOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
                        >
                            <Bell className="w-5 h-5" />
                            {notifications.length > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 rounded-full border-2 border-white" style={{ backgroundColor: '#FF2B2B' }} />
                            )}
                        </button>

                        <AnimatePresence>
                            {isNotifOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                                >
                                    <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                                        <span className="font-bold text-gray-900">
                                            {session.role === 'admin' ? 'System Activity' : 'Announcements'}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                            {session.role === 'admin' ? 'Recent' : 'Newest'}
                                        </span>
                                    </div>

                                    <div className="max-h-[400px] overflow-y-auto">
                                        {notifications.length > 0 ? (
                                            notifications.map((n, i) => {
                                                const isAnn = session.role !== 'admin';
                                                return (
                                                    <div key={n.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-0">
                                                        <div className="flex gap-3">
                                                            <div className="mt-1 flex-shrink-0">
                                                                <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                                                                    {isAnn ? <Megaphone className="w-4 h-4 text-blue-500" /> : getIcon(n.action)}
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                                    {isAnn ? n.title : n.action}
                                                                </p>
                                                                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                                                    {isAnn ? n.message : n.details}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1 font-medium">
                                                                    {moment(isAnn ? n.created_at : n.timestamp).fromNow()} • {isAnn ? (n.module || 'General') : n.module}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="p-10 text-center">
                                                <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                                <p className="text-sm text-gray-400">No new notifications</p>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={async () => {
                                            setIsNotifOpen(false);
                                            setIsAllActivityModalOpen(true);
                                            if (session.role === 'admin') {
                                                const { data } = await supabase
                                                    .from('audit_logs')
                                                    .select('*')
                                                    .order('timestamp', { ascending: false })
                                                    .limit(50);
                                                setAllActivities(data || []);
                                            } else {
                                                const { data } = await supabase
                                                    .from('announcements')
                                                    .select('*')
                                                    .eq('is_active', true)
                                                    .or(`target_audience.eq.all,target_audience.eq.${session.role},target_user_id.eq.${session.id}`)
                                                    .lte('scheduled_at', new Date().toISOString())
                                                    .order('scheduled_at', { ascending: false })
                                                    .limit(50);
                                                setAllActivities(data || []);
                                            }
                                        }}
                                        className="w-full p-3 text-center text-xs font-bold text-blue-600 hover:bg-gray-50 transition-colors border-t border-gray-50"
                                    >
                                        {session.role === 'admin' ? 'View All Activity' : 'View All Announcements'}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
                        <button
                            onClick={() => setIsProfileModalOpen(true)}
                            className="relative group transition-all hover:scale-105"
                        >
                            <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm overflow-hidden border border-gray-200"
                                style={{ backgroundColor: '#00104A' }}
                            >
                                {session.avatar_url ? (
                                    <img src={session.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    (session.name || session.full_name)?.charAt(0) || 'U'
                                )}
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <ProfileSettingsModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />

            <Modal
                isOpen={isAllActivityModalOpen}
                onClose={() => setIsAllActivityModalOpen(false)}
                title={session.role === 'admin' ? "All System Activity" : "All Announcements"}
                size="lg"
            >
                <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                    {allActivities.length > 0 ? allActivities.map((n) => {
                        const isAnn = session.role !== 'admin';
                        return (
                            <div key={n.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all hover:border-blue-200">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm">
                                            {isAnn ? <Megaphone className="w-5 h-5 text-blue-500" /> : getIcon(n.action || '')}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <p className="text-sm font-bold text-gray-900">{isAnn ? n.title : n.action}</p>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{isAnn ? (n.module || 'General') : n.module}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2 leading-relaxed">{isAnn ? n.message : n.details}</p>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                <p className="text-[10px] font-semibold text-gray-400 uppercase">{isAnn ? n.created_by : n.user_name}</p>
                                            </div>
                                            <p className="text-[10px] font-medium text-gray-400">
                                                {moment(isAnn ? n.created_at : n.timestamp).format('MMM DD, YYYY • hh:mm A')} ({moment(isAnn ? n.created_at : n.timestamp).fromNow()})
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="p-10 text-center">
                            <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">No activity records found</p>
                        </div>
                    )}
                </div>
            </Modal>
        </header>
    );
}