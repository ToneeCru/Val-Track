import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import StatCard from '../components/Statcard';
import BranchSelector from '../components/BranchSelector';
import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import { toast } from 'sonner';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts';

import {
    Users,
    ArrowUpRight,
    ArrowDownRight,
    Layout,
    Calendar,
    UserCheck,
    MapPin
} from 'lucide-react';
import moment from 'moment';

export default function AdminReports() {
    const navigate = useNavigate();
    const { selectedBranch: branch } = useBranch();
    const [session, setSession] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [isLoadingChart, setIsLoadingChart] = useState(false);

    // --- State ---

    // 1. Live/Today Stats (Fixed context)
    const [todayStats, setTodayStats] = useState({
        totalIn: 0,
        totalOut: 0,
        totalCurrent: 0,
        totalPatrons: 0,
        busyAreas: []
    });

    // 2. Chart Filter State (Independent)
    const [branchesFilter, setBranchesFilter] = useState('daily');
    const [branchesDate, setBranchesDate] = useState(moment().format('YYYY-MM-DD'));
    const [popularBranchesData, setPopularBranchesData] = useState([]);
    const [isLoadingBranches, setIsLoadingBranches] = useState(false);

    const [trafficFilter, setTrafficFilter] = useState('daily');
    const [trafficDate, setTrafficDate] = useState(moment().format('YYYY-MM-DD'));
    const [trafficData, setTrafficData] = useState([]);
    const [isLoadingTraffic, setIsLoadingTraffic] = useState(false);

    // 3. Gender Chart State
    const [genderData, setGenderData] = useState([]);
    const GENDER_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // --- Effects ---

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

    // Initial Load: Fetch Today's Stats & Live Data
    useEffect(() => {
        fetchTodayAndLiveData();
    }, [branch]);

    // Chart Update: Fetch data when filters change
    useEffect(() => {
        fetchPopularBranches();
    }, [branch, branchesFilter, branchesDate]);

    useEffect(() => {
        fetchTrafficData();
    }, [branch, trafficFilter, trafficDate]);

    // --- Fetch Logic ---

    const fetchTodayAndLiveData = async () => {
        setIsLoadingStats(true);
        try {
            const todayStart = moment().startOf('day').toISOString();
            const todayEnd = moment().endOf('day').toISOString();

            // 1. Fetch Today's Logs (for Counts)
            let logsQuery = supabase
                .from('audit_logs')
                .select('*')
                .gte('timestamp', todayStart)
                .lte('timestamp', todayEnd);

            if (branch?.id) {
                logsQuery = logsQuery.eq('branch_id', branch.id);
            }

            const { data: logs, error } = await logsQuery;

            if (error) throw error;

            const checkIns = logs.filter(l => l.action?.toLowerCase().includes('check-in'));
            const checkOuts = logs.filter(l => l.action?.toLowerCase().includes('check-out'));

            // 2. Fetch Live Attendance (Currently Inside & Busy Areas)
            let totalCurrent = 0;
            let busyAreasData = [];

            // Fetch floors based on branch selection or all floors if 'All Branches'
            let floorsQuery = supabase.from('floors').select('id, floor_number');
            if (branch?.id) {
                floorsQuery = floorsQuery.eq('branch_id', branch.id);
            }
            const { data: floors } = await floorsQuery;
            const floorIds = floors?.map(f => f.id) || [];

            if (floorIds.length > 0) {
                const { data: areas } = await supabase
                    .from('areas')
                    .select('id, name, capacity, floors(floor_number, label, branches(name))')
                    .in('floor_id', floorIds);
                const areaIds = areas?.map(a => a.id) || [];

                if (areaIds.length > 0) {
                    const { data: attendance } = await supabase
                        .from('area_attendance')
                        .select('area_id')
                        .eq('status', 'active')
                        .in('area_id', areaIds);

                    totalCurrent = attendance?.length || 0;

                    const areaCounts = attendance?.reduce((acc, curr) => {
                        acc[curr.area_id] = (acc[curr.area_id] || 0) + 1;
                        return acc;
                    }, {});

                    busyAreasData = areas.map(area => ({
                        id: area.id,
                        name: area.name,
                        branchName: area.floors?.branches?.name || 'Main',
                        floorLabel: area.floors?.label || `Floor ${area.floors?.floor_number}`,
                        count: areaCounts?.[area.id] || 0,
                        capacity: area.capacity,
                        occupancyRate: area.capacity > 0 ? ((areaCounts?.[area.id] || 0) / area.capacity) * 100 : 0
                    })).sort((a, b) => b.count - a.count).slice(0, 5);
                }
            }

            // Fetch Total Patrons Count
            const { count: totalPatronsCount } = await supabase
                .from('patrons')
                .select('*', { count: 'exact', head: true });

            setTodayStats({
                totalIn: checkIns.length,
                totalOut: checkOuts.length,
                totalCurrent,
                totalPatrons: totalPatronsCount || 0,
                busyAreas: busyAreasData
            });

        } catch (error) {
            console.error('Error fetching stats:', error);
            // toast.error('Failed to update live stats'); // Silently fail or minimal toast
        } finally {
            setIsLoadingStats(false);
        }
    };

    const fetchPopularBranches = async () => {
        setIsLoadingBranches(true);
        try {
            const date = moment(branchesDate);
            let startDate, endDate;

            if (branchesFilter === 'daily') {
                startDate = date.startOf('isoWeek').toISOString();
                endDate = date.endOf('isoWeek').toISOString();
            } else if (branchesFilter === 'weekly') {
                startDate = date.startOf('month').toISOString();
                endDate = date.endOf('month').toISOString();
            } else if (branchesFilter === 'monthly') {
                startDate = date.startOf('year').toISOString();
                endDate = date.endOf('year').toISOString();
            } else if (branchesFilter === 'yearly') {
                startDate = date.clone().subtract(4, 'years').startOf('year').toISOString();
                endDate = date.endOf('year').toISOString();
            }

            let logsQuery = supabase
                .from('audit_logs')
                .select('branch_id, action')
                .gte('timestamp', startDate)
                .lte('timestamp', endDate);

            if (branch?.id) {
                logsQuery = logsQuery.eq('branch_id', branch.id);
            }

            const { data: logs, error } = await logsQuery;
            if (error) throw error;

            // Fetch all branches to map names
            const { data: allBranches } = await supabase.from('branches').select('id, name');
            const branchMap = (allBranches || []).reduce((acc, b) => {
                acc[b.id] = b.name;
                return acc;
            }, {});

            const counts = {};
            logs?.forEach(l => {
                // Focus on Check-Ins for popularity
                if (l.action?.toLowerCase().includes('check-in')) {
                    const bId = l.branch_id;
                    const bName = branchMap[bId] || 'Unknown Branch';
                    counts[bName] = (counts[bName] || 0) + 1;
                }
            });

            const newData = Object.keys(counts).map(key => ({
                name: key,
                'Check-In': counts[key]
            })).sort((a, b) => b['Check-In'] - a['Check-In']).slice(0, 10); // Top 10

            setPopularBranchesData(newData);

        } catch (error) {
            console.error('Error fetching popular branches:', error);
            toast.error('Failed to load branches data');
        } finally {
            setIsLoadingBranches(false);
        }
    };

    const fetchTrafficData = async () => {
        setIsLoadingTraffic(true);
        try {
            const date = moment(trafficDate);
            let startDate, endDate;

            if (trafficFilter === 'daily') {
                startDate = date.startOf('isoWeek').toISOString();
                endDate = date.endOf('isoWeek').toISOString();
            } else if (trafficFilter === 'weekly') {
                startDate = date.startOf('month').toISOString();
                endDate = date.endOf('month').toISOString();
            } else if (trafficFilter === 'monthly') {
                startDate = date.startOf('year').toISOString();
                endDate = date.endOf('year').toISOString();
            } else if (trafficFilter === 'yearly') {
                startDate = date.clone().subtract(4, 'years').startOf('year').toISOString();
                endDate = date.endOf('year').toISOString();
            }

            let logsQuery = supabase
                .from('audit_logs')
                .select('*')
                .gte('timestamp', startDate)
                .lte('timestamp', endDate)
                .order('timestamp', { ascending: true });

            if (branch?.id) {
                logsQuery = logsQuery.eq('branch_id', branch.id);
            }

            const { data: logs, error } = await logsQuery;

            if (error) throw error;

            let newData = [];

            if (trafficFilter === 'daily') {
                for (let i = 0; i < 7; i++) {
                    const currentDay = moment(startDate).add(i, 'days');
                    const dayLogs = logs.filter(l => moment(l.timestamp).isSame(currentDay, 'day'));
                    newData.push({
                        name: currentDay.format('ddd'),
                        fullDate: currentDay.format('YYYY-MM-DD'),
                        'Check-In': dayLogs.filter(l => l.action?.toLowerCase().includes('check-in')).length,
                        'Check-Out': dayLogs.filter(l => l.action?.toLowerCase().includes('check-out')).length
                    });
                }
            } else if (trafficFilter === 'weekly') {
                const startOfMonth = moment(startDate);
                const endOfMonth = moment(endDate);
                let currentWeekStart = startOfMonth.clone().startOf('isoWeek');
                if (currentWeekStart.isBefore(startOfMonth)) currentWeekStart = startOfMonth.clone();
                let weekNum = 1;
                let loopDate = startOfMonth.clone();

                while (loopDate.isBefore(endOfMonth)) {
                    const weekEnd = loopDate.clone().endOf('isoWeek');
                    const actualEnd = weekEnd.isAfter(endOfMonth) ? endOfMonth.clone() : weekEnd;
                    const weekLogs = logs.filter(l => {
                        const t = moment(l.timestamp);
                        return t.isSameOrAfter(loopDate) && t.isSameOrBefore(actualEnd);
                    });
                    newData.push({
                        name: `Week ${weekNum}`,
                        range: `${loopDate.format('MMM D')} - ${actualEnd.format('MMM D')}`,
                        'Check-In': weekLogs.filter(l => l.action?.toLowerCase().includes('check-in')).length,
                        'Check-Out': weekLogs.filter(l => l.action?.toLowerCase().includes('check-out')).length
                    });
                    loopDate.add(1, 'week').startOf('isoWeek');
                    weekNum++;
                    if (weekNum > 6) break;
                }
            } else if (trafficFilter === 'monthly') {
                for (let i = 0; i < 12; i++) {
                    const currentMonth = moment(startDate).month(i);
                    const monthLogs = logs.filter(l => moment(l.timestamp).month() === i);
                    newData.push({
                        name: currentMonth.format('MMM'),
                        'Check-In': monthLogs.filter(l => l.action?.toLowerCase().includes('check-in')).length,
                        'Check-Out': monthLogs.filter(l => l.action?.toLowerCase().includes('check-out')).length
                    });
                }
            } else if (trafficFilter === 'yearly') {
                for (let i = 0; i < 5; i++) {
                    const currentYear = moment(startDate).add(i, 'years');
                    const yearLogs = logs.filter(l => moment(l.timestamp).year() === currentYear.year());
                    newData.push({
                        name: currentYear.format('YYYY'),
                        'Check-In': yearLogs.filter(l => l.action?.toLowerCase().includes('check-in')).length,
                        'Check-Out': yearLogs.filter(l => l.action?.toLowerCase().includes('check-out')).length
                    });
                }
            }

            setTrafficData(newData);

        } catch (error) {
            console.error('Error fetching traffic data:', error);
            toast.error('Failed to load traffic data');
        } finally {
            setIsLoadingTraffic(false);
        }
    };

    const fetchGenderData = async () => {
        try {
            // Fetch all patrons (Global for now as patrons aren't strictly branch-tied)
            const { data: patrons, error } = await supabase
                .from('patrons')
                .select('gender');

            if (error) throw error;

            const counts = {};
            patrons.forEach(p => {
                const g = p.gender || 'Not Specified';
                counts[g] = (counts[g] || 0) + 1;
            });

            const data = Object.keys(counts).map(key => ({
                name: key,
                value: counts[key]
            }));

            setGenderData(data);
        } catch (error) {
            console.error('Error fetching gender data:', error);
        }
    };

    // Initial Load
    useEffect(() => {
        if (session) {
            fetchGenderData();
        }
    }, [session]);


    if (!session) return null;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
            <Sidebar role="admin" />

            <div className="ml-64">
                <Topbar title="Analytics" subtitle={branch ? `${branch.name} Overview` : 'All Branches Overview'} />

                <div className="px-8 pt-6">
                    <div className="flex justify-end">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 font-medium">Viewing Data For:</span>
                            <BranchSelector />
                        </div>
                    </div>
                </div>

                <main className="p-8">
                    {/* Live/Today Stats Cards - Always Visible, No Filter */}
                    <div className="mb-8">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Today's Overview
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                title="Total Patrons"
                                value={todayStats.totalPatrons}
                                icon={UserCheck}
                                color="#8B5CF6"
                            />
                            <StatCard
                                title="Currently Inside"
                                value={todayStats.totalCurrent}
                                icon={Users}
                                color="#56CBF9"
                            />
                            <StatCard
                                title="Check-ins (Today)"
                                value={todayStats.totalIn}
                                icon={ArrowUpRight}
                                color="#10B981"
                            />
                            <StatCard
                                title="Check-outs (Today)"
                                value={todayStats.totalOut}
                                icon={ArrowDownRight}
                                color="#EF4444"
                            />
                        </div>
                    </div>

                    {/* Analytics Section Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* 1. Activity Trends Chart (Filterable) */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* 1. Popular Branches Chart */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex flex-col">
                                {/* Header & Filters */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Popular Branches</h3>
                                        <p className="text-sm text-gray-500">Highest volume by branch</p>
                                    </div>
                                    <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                                        <select
                                            className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer"
                                            value={branchesFilter}
                                            onChange={(e) => setBranchesFilter(e.target.value)}
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="yearly">Yearly</option>
                                        </select>
                                        {branchesFilter !== 'yearly' && <div className="border-l border-gray-300 mx-2"></div>}
                                        {branchesFilter !== 'yearly' && (
                                            <input
                                                type={branchesFilter === 'monthly' ? "month" : "date"}
                                                className="bg-transparent border-none text-sm text-gray-600 focus:ring-0 p-0 w-32 cursor-pointer"
                                                value={branchesFilter === 'monthly' ? branchesDate.slice(0, 7) : branchesDate}
                                                onChange={(e) => setBranchesDate(e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Chart Body */}
                                <div className="flex-1 w-full min-h-[350px]">
                                    {isLoadingBranches ? (
                                        <div className="h-full flex justify-center items-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#56CBF9' }}></div>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={popularBranchesData} layout="vertical" margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                                                <XAxis type="number" hide />
                                                <YAxis
                                                    dataKey="name"
                                                    type="category"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }}
                                                    width={100}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: '#F1F5F9', opacity: 0.6 }}
                                                    contentStyle={{
                                                        backgroundColor: '#00104A',
                                                        color: '#F8FAFC',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                    }}
                                                    itemStyle={{ color: '#F8FAFC' }}
                                                />
                                                <Bar dataKey="Check-In" fill="#56CBF9" radius={[0, 4, 4, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* 2. Visitor Traffic Area Chart */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex flex-col">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Visitor Traffic</h3>
                                        <p className="text-sm text-gray-500">Inbound vs Outbound activity</p>
                                    </div>
                                    <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                                        <select
                                            className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer"
                                            value={trafficFilter}
                                            onChange={(e) => setTrafficFilter(e.target.value)}
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="yearly">Yearly</option>
                                        </select>
                                        {trafficFilter !== 'yearly' && <div className="border-l border-gray-300 mx-2"></div>}
                                        {trafficFilter !== 'yearly' && (
                                            <input
                                                type={trafficFilter === 'monthly' ? "month" : "date"}
                                                className="bg-transparent border-none text-sm text-gray-600 focus:ring-0 p-0 w-32 cursor-pointer"
                                                value={trafficFilter === 'monthly' ? trafficDate.slice(0, 7) : trafficDate}
                                                onChange={(e) => setTrafficDate(e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 w-full min-h-[350px]">
                                    {isLoadingTraffic ? (
                                        <div className="h-full flex justify-center items-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#56CBF9' }}></div>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={350}>
                                            <AreaChart data={trafficData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#56CBF9" stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor="#56CBF9" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#FF2B2B" stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor="#FF2B2B" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748B', fontSize: 12 }}
                                                    dx={-10}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#00104A',
                                                        color: '#F8FAFC',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                        fontSize: '13px',
                                                        fontWeight: 500
                                                    }}
                                                    itemStyle={{ color: '#F8FAFC' }}
                                                />
                                                <Legend
                                                    wrapperStyle={{ paddingTop: '20px' }}
                                                    iconType="circle"
                                                    formatter={(value) => <span className="text-sm font-medium ml-1" style={{ color: '#232323' }}>{value}</span>}
                                                />
                                                <Area type="monotone" dataKey="Check-In" stroke="#56CBF9" fillOpacity={1} fill="url(#colorIn)" />
                                                <Area type="monotone" dataKey="Check-Out" stroke="#FF2B2B" fillOpacity={1} fill="url(#colorOut)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stacked Right Column */}
                        <div className="space-y-6 h-full flex flex-col">
                            {/* 2. Busy Areas (Live Context - No Filter) */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col min-h-[300px]">
                                <h3 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: '#232323' }}>
                                    <MapPin className="w-5 h-5" style={{ color: '#56CBF9' }} />
                                    Current Busy Areas
                                </h3>
                                <p className="text-sm text-slate-500 mb-6">Real-time occupancy status</p>

                                <div className="space-y-4 flex-1 overflow-y-auto max-h-[250px]">
                                    {!isLoadingStats && todayStats.busyAreas && todayStats.busyAreas.length > 0 ? (
                                        todayStats.busyAreas.map((area) => (
                                            <div key={area.id} className="p-4 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="font-semibold text-sm" style={{ color: '#232323' }}>{area.name}</p>
                                                        <div className="flex flex-col gap-1 mt-1">
                                                            <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                                                <MapPin className="w-3 h-3" />
                                                                {area.branchName} • {area.floorLabel}
                                                            </p>
                                                            <p className="text-xs text-slate-400">
                                                                {area.count} / {area.capacity} people
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full`}
                                                        style={{
                                                            backgroundColor: area.occupancyRate > 80 ? '#FF2B2B15' : area.occupancyRate > 50 ? '#56CBF915' : '#10B98115',
                                                            color: area.occupancyRate > 80 ? '#FF2B2B' : area.occupancyRate > 50 ? '#00104A' : '#10B981'
                                                        }}
                                                    >
                                                        {Math.round(area.occupancyRate)}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                                                    <div
                                                        className="h-2 rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${Math.min(area.occupancyRate, 100)}%`,
                                                            backgroundColor: area.occupancyRate > 80 ? '#FF2B2B' : area.occupancyRate > 50 ? '#56CBF9' : '#10B981'
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm py-8">
                                            <Layout className="w-10 h-10 mb-3 opacity-20" />
                                            <p className="font-medium">No active area data.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 3. Gender Distribution */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col min-h-[300px]">
                                <h3 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: '#232323' }}>
                                    <Users className="w-5 h-5" style={{ color: '#56CBF9' }} />
                                    Patron Demographics
                                </h3>
                                <p className="text-sm text-slate-500 mb-6">Registered patrons by gender</p>

                                <div className="flex-1 w-full min-h-[250px]">
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie
                                                data={genderData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={90}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {genderData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#00104A', '#56CBF9', '#FF2B2B', '#CBD5E1'][index % 4]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#00104A',
                                                    color: '#F8FAFC',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                    fontSize: '13px',
                                                    fontWeight: 500
                                                }}
                                                itemStyle={{ color: '#F8FAFC' }}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                iconType="circle"
                                                formatter={(value, entry) => (
                                                    <span className="text-xs font-semibold ml-1" style={{ color: '#232323' }}>
                                                        {value} <span className="text-slate-400 font-normal">({entry.payload.value})</span>
                                                    </span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div >
        </div >
    );
}
