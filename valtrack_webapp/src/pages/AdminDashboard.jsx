import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import StatCard from '../components/Statcard';
import BranchSelector from '../components/BranchSelector';
import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import {
    Users,
    Package,
    QrCode,
    AlertTriangle,
    Building2,
    Layout,
    MapPin
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { selectedBranch: branch } = useBranch();
    const [session, setSession] = useState(null);
    const [stats, setStats] = useState({
        totalPatrons: 0,
        currentlyInside: 0,
        totalScans: 0,
        activeBaggage: 0,
        openIncidents: 0,
        areaStats: [],
        recentActivity: []
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const sessionData = localStorage.getItem('valtrack_session');
        if (!sessionData) {
            navigate('/Home');
            return;
        }
        const parsed = JSON.parse(sessionData);
        if (parsed.role !== 'admin') {
            navigate('/Home');
            return;
        }
        setSession(parsed);
    }, [navigate]);

    useEffect(() => {
        fetchDashboardData();
    }, [branch]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Floors
            let floorQuery = supabase
                .from('floors')
                .select('id, floor_number, label, branch_id');

            if (branch?.id) {
                floorQuery = floorQuery.eq('branch_id', branch.id);
            }

            const { data: floors } = await floorQuery;
            const floorIds = floors?.map(f => f.id) || [];

            // 2. Fetch Areas
            let areasData = [];
            if (floorIds.length > 0) {
                const { data } = await supabase
                    .from('areas')
                    .select('*')
                    .in('floor_id', floorIds)
                    .order('name');
                areasData = data || [];
            }

            const areaIds = areasData.map(a => a.id);

            // 3. Current Attendance (Active only)
            let activeAttendance = 0;
            let areaStatsList = [];

            if (areaIds.length > 0) {
                const { data: attendanceData } = await supabase
                    .from('area_attendance')
                    .select('area_id')
                    .eq('status', 'active')
                    .in('area_id', areaIds);

                activeAttendance = attendanceData?.length || 0;

                // Map stats per Area
                areaStatsList = areasData.map(area => {
                    const floor = floors.find(f => f.id === area.floor_id);
                    const current = attendanceData.filter(a => a.area_id === area.id).length;

                    return {
                        id: area.id,
                        name: area.name,
                        type: area.type,
                        // Floor info as Label
                        floorLabel: floor ? (floor.label || `Floor ${floor.floor_number}`) : '',
                        floorNumber: floor ? floor.floor_number : 0,
                        capacity: area.capacity,
                        current: current
                    };
                });
            }

            // 4. Daily Scans (Audit Logs)
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let logsQuery = supabase
                .from('audit_logs')
                .select('*', { count: 'exact', head: true })
                .gte('timestamp', today.toISOString())
                .or('action.ilike.%Check-In%,action.ilike.%Check-Out%');

            if (branch?.id) {
                logsQuery = logsQuery.eq('branch_id', branch.id);
            }

            const { count: dailyScans } = await logsQuery;

            // 5. Active Baggage
            let activeBaggageCount = 0;
            if (areaIds.length > 0) {
                const { count } = await supabase
                    .from('baggage')
                    .select('*', { count: 'exact', head: true })
                    .in('area_id', areaIds)
                    .eq('status', 'occupied');
                activeBaggageCount = count || 0;
            }

            // 6. Open Incidents
            let incidentQuery = supabase
                .from('incidents')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'open');

            if (branch?.id) {
                incidentQuery = incidentQuery.eq('branch_id', branch.id);
            }

            const { count: openIncidents } = await incidentQuery;

            setStats({
                totalPatrons: activeAttendance,
                currentlyInside: activeAttendance,
                totalScans: dailyScans || 0,
                activeBaggage: activeBaggageCount,
                openIncidents: openIncidents || 0,
                // Sort by floor number then area name
                areaStats: areaStatsList.sort((a, b) => (a.floorNumber - b.floorNumber) || a.name.localeCompare(b.name)),
                recentActivity: [] // Empty
            });

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setIsLoading(false);
        }
    };

    if (!session) return null;

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar role="admin" />

            <div className="ml-64">
                <Topbar
                    title="Dashboard"
                    subtitle={branch ? `${branch.name} Overview` : 'All Branches Overview'}
                />

                <div className="px-8 pt-6">
                    <div className="flex justify-end">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 font-medium">Viewing Data For:</span>
                            <BranchSelector />
                        </div>
                    </div>
                </div>

                <main className="p-8">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <StatCard
                                    title="Open Incidents"
                                    value={stats.openIncidents}
                                    icon={AlertTriangle}
                                    color="#FF2B2B"
                                />
                                <StatCard
                                    title="Currently Inside"
                                    value={stats.currentlyInside}
                                    icon={Building2}
                                    color="#10B981"
                                />
                                <StatCard
                                    title="Total Scans Today"
                                    value={stats.totalScans}
                                    icon={QrCode}
                                    trend="Checked In/Out"
                                    trendUp={true}
                                    color="#8B5CF6"
                                />
                                <StatCard
                                    title="Active Baggage"
                                    value={stats.activeBaggage}
                                    icon={Package}
                                    color="#F59E0B"
                                />
                            </div>

                            {/* Area Statistics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                {stats.areaStats?.map((area) => (
                                    <div key={area.id} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">

                                        {/* Decorative Icon */}
                                        <div className="absolute right-4 top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <Users className="w-24 h-24" />
                                        </div>

                                        <div className="relative z-10">
                                            {/* Header: Floor Label */}
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-md">
                                                    <MapPin className="w-3 h-3" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">
                                                        {area.floorLabel}
                                                    </span>
                                                </div>

                                                <span
                                                    className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                                                    style={{
                                                        backgroundColor: area.current >= area.capacity * 0.9 ? '#FEE2E2' : '#D1FAE5',
                                                        color: area.current >= area.capacity * 0.9 ? '#DC2626' : '#059669'
                                                    }}
                                                >
                                                    {area.capacity > 0 ? Math.round((area.current / area.capacity) * 100) : 0}% Full
                                                </span>
                                            </div>

                                            {/* Main Title: Area Name */}
                                            <h3 className="text-xl font-bold text-gray-900 mb-1 leading-tight">
                                                {area.name}
                                            </h3>
                                            <p className="text-sm text-gray-400 mb-4 font-medium">{area.type}</p>

                                            {/* Progress Bar & Stats */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-500">Occupancy</span>
                                                    <span className="flex items-center gap-1 text-base font-bold text-gray-700">
                                                        {area.current} <span className="text-gray-400 text-sm font-normal">/ {area.capacity}</span>
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                    <div
                                                        className="h-2.5 rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${Math.min((area.current / area.capacity) * 100, 100)}%`,
                                                            backgroundColor: area.current >= area.capacity * 0.9 ? '#EF4444' : '#56CBF9'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!stats.areaStats || stats.areaStats.length === 0) && (
                                    <div className="col-span-full py-8 text-center text-gray-400 bg-white rounded-xl border border-gray-100 border-dashed">
                                        No areas found.
                                    </div>
                                )}
                            </div>

                            {/* Top Busy Areas */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                            <MapPin className="w-5 h-5 text-gray-400" />
                                            Top Busy Areas
                                        </h3>
                                        <p className="text-sm text-gray-500">Highest occupancy areas</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                    {stats.areaStats && stats.areaStats.length > 0 ? (
                                        stats.areaStats
                                            .sort((a, b) => b.current - a.current)
                                            .slice(0, 5)
                                            .map((area) => {
                                                const occupancyRate = area.capacity > 0 ? (area.current / area.capacity) * 100 : 0;
                                                return (
                                                    <div key={area.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <p className="font-medium text-gray-900 text-sm truncate" title={area.name}>{area.name}</p>
                                                                <p className="text-xs text-gray-500 mt-1">{area.current} / {area.capacity}</p>
                                                            </div>
                                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${occupancyRate > 80 ? 'bg-red-100 text-red-600' :
                                                                occupancyRate > 50 ? 'bg-yellow-100 text-yellow-600' :
                                                                    'bg-green-100 text-green-600'
                                                                }`}>
                                                                {Math.round(occupancyRate)}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                                            <div
                                                                className={`h-1.5 rounded-full ${occupancyRate > 80 ? 'bg-red-500' :
                                                                    occupancyRate > 50 ? 'bg-yellow-500' :
                                                                        'bg-green-500'
                                                                    }`}
                                                                style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                    ) : (
                                        <div className="col-span-full flex flex-col items-center justify-center p-8 text-gray-400 text-sm">
                                            <Layout className="w-8 h-8 mb-2 opacity-20" />
                                            <p>No active area data.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}