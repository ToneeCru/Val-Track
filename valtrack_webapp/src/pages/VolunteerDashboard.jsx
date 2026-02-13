import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import {
    ArrowUpRight,
    ArrowDownRight,
    Package,
    Clock,
    MapPin,
    Users
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import { toast } from 'sonner';

export default function VolunteerDashboard() {
    const navigate = useNavigate();
    const { selectedBranch } = useBranch();
    const [session, setSession] = useState(null);

    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);

    // Dashboard Stats
    const [stats, setStats] = useState({
        activeCount: 0,
        todayCheckIns: 0,
        activeBaggage: 0
    });
    const [recentActivity, setRecentActivity] = useState([]); // Attendance logs
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const sessionData = localStorage.getItem('valtrack_session');
        if (!sessionData) {
            navigate('/Home');
            return;
        }
        const parsed = JSON.parse(sessionData);
        if (parsed.role !== 'volunteer') {
            navigate('/Home');
            return;
        }
        setSession(parsed);
    }, [navigate]);

    // Fetch Areas when branch changes
    useEffect(() => {
        if (selectedBranch?.id) {
            fetchAreas();
        }
    }, [selectedBranch]);

    // Fetch Dashboard Data when Area changes
    useEffect(() => {
        if (selectedArea) {
            fetchDashboardData();

            // Real-time subscriptions
            const attendanceChannel = supabase
                .channel(`volunteer_attendance_${selectedArea.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'area_attendance',
                    filter: `area_id=eq.${selectedArea.id}`
                }, () => fetchDashboardData())
                .subscribe();

            const baggageChannel = supabase
                .channel(`volunteer_baggage_${selectedArea.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'baggage',
                    filter: `area_id=eq.${selectedArea.id}`
                }, () => fetchDashboardData())
                .subscribe();

            return () => {
                supabase.removeChannel(attendanceChannel);
                supabase.removeChannel(baggageChannel);
            };
        }
    }, [selectedArea]);

    const fetchAreas = async () => {
        try {
            const { data: floors } = await supabase.from('floors').select('id').eq('branch_id', selectedBranch.id);
            const floorIds = floors?.map(f => f.id) || [];

            if (floorIds.length > 0) {
                const { data: areaData } = await supabase
                    .from('areas')
                    .select('*, floors(label, floor_number)')
                    .in('floor_id', floorIds)
                    .order('name');

                setAreas(areaData || []);
                if (areaData?.length > 0 && !selectedArea) {
                    setSelectedArea(areaData[0]);
                }
            } else {
                setAreas([]);
            }
        } catch (error) {
            console.error("Error fetching areas", error);
        }
    };

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 1. Active Attendance in Area (Current Headcount)
            const { count: activeCount } = await supabase
                .from('area_attendance')
                .select('*', { count: 'exact', head: true })
                .eq('area_id', selectedArea.id)
                .eq('status', 'active');

            // 2. Check-ins Today (Total Entries)
            // Assuming entry_time is active
            const { count: totalEntries } = await supabase
                .from('area_attendance')
                .select('*', { count: 'exact', head: true })
                .eq('area_id', selectedArea.id)
                .gte('entry_time', today.toISOString());

            // 3. Active Baggage in Area
            const { count: activeBaggage } = await supabase
                .from('baggage')
                .select('*', { count: 'exact', head: true })
                .eq('area_id', selectedArea.id)
                .eq('status', 'occupied');

            setStats({
                activeCount: activeCount || 0,
                todayCheckIns: totalEntries || 0,
                activeBaggage: activeBaggage || 0
            });

            // 4. Recent Activity (Last 5 checks)
            const { data: activity } = await supabase
                .from('area_attendance')
                .select('*')
                .eq('area_id', selectedArea.id)
                .order('entry_time', { ascending: false })
                .limit(5);

            setRecentActivity(activity || []);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            // toast.error('Failed to load dashboard data');
        } finally {
            setIsLoading(false);
        }
    };

    if (!session) return null;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
            <Sidebar role="volunteer" />

            <div className="ml-64">
                <Topbar title="Volunteer Dashboard" subtitle={`Welcome back, ${session.name}`} />

                <main className="p-8">
                    {/* Area Selector */}
                    <div className="bg-white rounded-xl p-6 border border-gray-100 mb-8 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-blue-600" />
                                Work Area
                            </h2>
                            <p className="text-sm text-gray-500">Select the area you are monitoring</p>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto max-w-2xl pb-2">
                            {areas.map(area => (
                                <button
                                    key={area.id}
                                    onClick={() => setSelectedArea(area)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${selectedArea?.id === area.id
                                            ? 'bg-[#00104A] text-white shadow-md'
                                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                        }`}
                                >
                                    {area.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                        </div>
                    ) : selectedArea ? (
                        <>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Users className="w-24 h-24 text-blue-900" />
                                    </div>
                                    <div className="relative">
                                        <div className="flex items-center gap-2 mb-2 text-gray-500 text-sm font-medium">
                                            <ArrowUpRight className="w-4 h-4 text-green-500" /> Current Patrons
                                        </div>
                                        <p className="text-4xl font-bold text-gray-900">{stats.activeCount}</p>
                                        <p className="text-xs text-green-600 mt-2 font-medium">Inside now</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <ArrowUpRight className="w-24 h-24 text-green-900" />
                                    </div>
                                    <div className="relative">
                                        <div className="flex items-center gap-2 mb-2 text-gray-500 text-sm font-medium">
                                            <Clock className="w-4 h-4 text-blue-500" /> Total Check-ins
                                        </div>
                                        <p className="text-4xl font-bold text-gray-900">{stats.todayCheckIns}</p>
                                        <p className="text-xs text-gray-400 mt-2">Today</p>
                                    </div>
                                </div>

                                <div
                                    className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group cursor-pointer hover:border-amber-200 transition-colors"
                                    onClick={() => navigate('/VolunteerActiveBaggage')} // Assuming page exists or leads to baggage tool
                                >
                                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Package className="w-24 h-24 text-amber-900" />
                                    </div>
                                    <div className="relative">
                                        <div className="flex items-center gap-2 mb-2 text-gray-500 text-sm font-medium">
                                            <Package className="w-4 h-4 text-amber-500" /> Active Baggage
                                        </div>
                                        <p className="text-4xl font-bold text-gray-900">{stats.activeBaggage}</p>
                                        <p className="text-xs text-amber-600 mt-2 font-medium">Items stored</p>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Scans List */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-900">Recent Activity in {selectedArea.name}</h3>
                                    <span className="text-xs text-gray-400">Latest 5 checks</span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {recentActivity.length > 0 ? recentActivity.map((scan) => (
                                        <div key={scan.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${scan.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {scan.status === 'active' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-gray-900">{scan.patron_name}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{scan.patron_id}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1 ${scan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {scan.status === 'active' ? 'Check In' : 'Check Out'}
                                                </div>
                                                <p className="text-xs text-gray-400 flex items-center justify-end gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(scan.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-8 text-center text-gray-400 italic">
                                            No recent activity recorded.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <MapPin className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-500 font-medium">Please select an area to view dashboard stats.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}