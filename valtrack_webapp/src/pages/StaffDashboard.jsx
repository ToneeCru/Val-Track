import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import StatCard from '../components/Statcard';
import {
    Users,
    Package,
    QrCode,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    MapPin
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import { toast } from 'sonner';

export default function StaffDashboard() {
    const navigate = useNavigate();
    const { selectedBranch } = useBranch();
    const [session, setSession] = useState(null);
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [stats, setStats] = useState({
        checkinsToday: 0,
        checkoutsToday: 0,
        activeBaggage: 0,
        openIncidents: 0
    });
    const [recentScans, setRecentScans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const sessionData = localStorage.getItem('valtrack_session');
        if (!sessionData) {
            navigate('/Home');
            return;
        }
        const parsed = JSON.parse(sessionData);
        if (parsed.role !== 'staff') {
            navigate('/Home');
            return;
        }
        setSession(parsed);
    }, [navigate]);

    // Fetch Areas for the selected branch
    useEffect(() => {
        const fetchAreas = async () => {
            if (!selectedBranch?.id) return;

            try {
                // Fetch floors first
                const { data: floors } = await supabase
                    .from('floors')
                    .select('id')
                    .eq('branch_id', selectedBranch.id);

                const floorIds = floors?.map(f => f.id) || [];

                if (floorIds.length > 0) {
                    const { data: areaData, error } = await supabase
                        .from('areas')
                        .select('*, floors(label, floor_number)')
                        .in('floor_id', floorIds)
                        .order('name');

                    if (error) throw error;
                    setAreas(areaData || []);
                    if (areaData?.length > 0) {
                        setSelectedArea(areaData[0]);
                    }
                } else {
                    setAreas([]);
                }
            } catch (error) {
                console.error("Error fetching areas", error);
            }
        };

        fetchAreas();
    }, [selectedBranch]);

    useEffect(() => {
        if (session && selectedArea) {
            fetchDashboardStats();

            // Subscribe to changes
            const channel = supabase
                .channel(`dashboard_staff_${selectedArea.id}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'area_attendance', filter: `area_id=eq.${selectedArea.id}` }, () => fetchDashboardStats())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'baggage', filter: `area_id=eq.${selectedArea.id}` }, () => fetchDashboardStats())
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [session, selectedArea]);

    const fetchDashboardStats = async () => {
        if (!selectedArea) return;
        setIsLoading(true);
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 1. Check-ins Today
            const { count: checkins } = await supabase
                .from('area_attendance')
                .select('*', { count: 'exact', head: true })
                .eq('area_id', selectedArea.id)
                .gte('entry_time', today.toISOString());

            // 2. Check-outs Today
            const { count: checkouts } = await supabase
                .from('area_attendance')
                .select('*', { count: 'exact', head: true })
                .eq('area_id', selectedArea.id)
                .eq('status', 'exited') // Assuming 'active' vs 'exited' or checking exit_time
                .not('exit_time', 'is', null) // Filter for those who exited
                .gte('exit_time', today.toISOString());

            // 3. Active Baggage
            const { count: baggage } = await supabase
                .from('baggage')
                .select('*', { count: 'exact', head: true })
                .eq('area_id', selectedArea.id)
                .eq('status', 'active');

            // 4. Open Incidents (Filtered by branch potentially, or linked to area if possible)
            // Currently incidents table might not have area_id yet, likely still has 'floor'. 
            // We should ideally update incidents to have area_id or filter by branch.
            // For now, let's filter by branch using a join if possible, or just ignore area specific filter if schema is old.
            // Assuming incidents updated to have brand_id.

            const { count: incidents } = await supabase
                .from('incidents')
                .select('*', { count: 'exact', head: true })
                .eq('branch_id', selectedBranch.id)
                .eq('status', 'open');

            // 5. Recent Scans
            const { data: scans } = await supabase
                .from('area_attendance')
                .select('*')
                .eq('area_id', selectedArea.id)
                .order('entry_time', { ascending: false })
                .limit(5);

            setStats({
                checkinsToday: checkins || 0,
                checkoutsToday: checkouts || 0,
                activeBaggage: baggage || 0,
                openIncidents: incidents || 0
            });
            setRecentScans(scans || []);
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!session) return null;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
            <Sidebar role="staff" />

            <div className="ml-64">
                <Topbar title="Staff Dashboard" subtitle={`Welcome back, ${session.name || session.username}`} />

                <main className="p-8">
                    {/* Area Selection */}
                    <div className="bg-white rounded-xl p-4 border border-gray-100 mb-8 shadow-sm">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-blue-600" />
                                    Current Area Assignment
                                </h3>
                                <p className="text-sm text-gray-500">Select your working area for today</p>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0">
                                {areas.length > 0 ? areas.map((area) => (
                                    <button
                                        key={area.id}
                                        onClick={() => setSelectedArea(area)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${selectedArea?.id === area.id
                                                ? 'bg-[#00104A] text-white shadow-md transform scale-105'
                                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                            }`}
                                    >
                                        {area.name} <span className="opacity-60 text-xs ml-1">({area.floors?.label || `Fl ${area.floors?.floor_number}`})</span>
                                    </button>
                                )) : (
                                    <span className="text-sm text-gray-400 italic">No areas found in this branch</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {!selectedArea ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-dashed border-gray-300">
                            <MapPin className="w-12 h-12 text-gray-300 mb-2" />
                            <p className="text-gray-500">Please select an area above to view statistics.</p>
                        </div>
                    ) : isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <StatCard
                                    title="Check-ins Today"
                                    value={stats.checkinsToday}
                                    icon={ArrowUpRight}
                                    color="#10B981"
                                />
                                <StatCard
                                    title="Check-outs Today"
                                    value={stats.checkoutsToday}
                                    icon={ArrowDownRight}
                                    color="#6B7280"
                                />
                                <StatCard
                                    title="Active Baggage"
                                    value={stats.activeBaggage}
                                    icon={Package}
                                    color="#F59E0B"
                                    onClick={() => navigate('/StaffActiveBaggage')}
                                />
                                <StatCard
                                    title="Open Incidents"
                                    value={stats.openIncidents}
                                    icon={AlertTriangle}
                                    color="#FF2B2B"
                                    onClick={() => navigate('/StaffIncidents')}
                                />
                            </div>

                            {/* Recent Scans */}
                            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-gray-900">Recent Area Scans</h3>
                                    <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                                        {selectedArea.name}
                                    </span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {recentScans.length > 0 ? recentScans.map((scan) => (
                                        <div key={scan.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                                                    style={{
                                                        backgroundColor: scan.status === 'active' ? '#10B98115' : '#6B728015'
                                                    }}
                                                >
                                                    {scan.status === 'active'
                                                        ? <ArrowUpRight className="w-5 h-5" style={{ color: '#10B981' }} />
                                                        : <ArrowDownRight className="w-5 h-5" style={{ color: '#6B7280' }} />
                                                    }
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{scan.patron_name}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{scan.patron_id}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className="px-3 py-1 rounded-full text-xs font-medium"
                                                    style={{
                                                        backgroundColor: scan.status === 'active' ? '#10B98115' : '#6B728015',
                                                        color: scan.status === 'active' ? '#10B981' : '#6B7280'
                                                    }}
                                                >
                                                    {scan.status === 'active' ? 'IN' : 'OUT'}
                                                </span>
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(scan.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-12 text-center flex flex-col items-center text-gray-400">
                                            <QrCode className="w-10 h-10 mb-3 opacity-20" />
                                            <p className="text-sm">No recent scans in this area today.</p>
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