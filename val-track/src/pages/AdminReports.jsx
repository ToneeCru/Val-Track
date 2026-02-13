import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import StatCard from '../components/Statcard';
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
    Legend
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
    const [chartFilter, setChartFilter] = useState('daily'); // 'daily', 'weekly', 'monthly', 'yearly'
    const [chartDate, setChartDate] = useState(moment().format('YYYY-MM-DD'));
    const [chartData, setChartData] = useState([]);

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
        if (branch?.id) {
            fetchTodayAndLiveData();
        }
    }, [branch]);

    // Chart Update: Fetch only chart data when filters change
    useEffect(() => {
        if (branch?.id) {
            fetchChartData();
        }
    }, [branch, chartFilter, chartDate]);

    // --- Fetch Logic ---

    const fetchTodayAndLiveData = async () => {
        setIsLoadingStats(true);
        try {
            const todayStart = moment().startOf('day').toISOString();
            const todayEnd = moment().endOf('day').toISOString();

            // 1. Fetch Today's Logs (for Counts)
            const { data: logs, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('branch_id', branch.id)
                .gte('timestamp', todayStart)
                .lte('timestamp', todayEnd);

            if (error) throw error;

            const checkIns = logs.filter(l => l.action?.toLowerCase().includes('check-in'));
            const checkOuts = logs.filter(l => l.action?.toLowerCase().includes('check-out'));

            // 2. Fetch Live Attendance (Currently Inside & Busy Areas)
            let totalCurrent = 0;
            let busyAreasData = [];

            const { data: floors } = await supabase.from('floors').select('id, floor_number').eq('branch_id', branch.id);
            const floorIds = floors?.map(f => f.id) || [];

            if (floorIds.length > 0) {
                const { data: areas } = await supabase.from('areas').select('id, name, capacity, floors(floor_number, label)').in('floor_id', floorIds);
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
                        name: `${area.floors?.label || `Floor ${area.floors?.floor_number}`} - ${area.name}`,
                        count: areaCounts?.[area.id] || 0,
                        capacity: area.capacity,
                        occupancyRate: area.capacity > 0 ? ((areaCounts?.[area.id] || 0) / area.capacity) * 100 : 0
                    })).sort((a, b) => b.count - a.count).slice(0, 5);
                }
            }

            setTodayStats({
                totalIn: checkIns.length,
                totalOut: checkOuts.length,
                totalCurrent,
                totalPatrons: checkIns.length, // approximation for today
                busyAreas: busyAreasData
            });

        } catch (error) {
            console.error('Error fetching stats:', error);
            // toast.error('Failed to update live stats'); // Silently fail or minimal toast
        } finally {
            setIsLoadingStats(false);
        }
    };

    const fetchChartData = async () => {
        setIsLoadingChart(true);
        try {
            const date = moment(chartDate);
            let startDate, endDate;

            // Define Time Ranges for filtering
            if (chartFilter === 'daily') {
                startDate = date.startOf('isoWeek').toISOString();
                endDate = date.endOf('isoWeek').toISOString();
            } else if (chartFilter === 'weekly') {
                startDate = date.startOf('month').toISOString();
                endDate = date.endOf('month').toISOString();
            } else if (chartFilter === 'monthly') {
                startDate = date.startOf('year').toISOString();
                endDate = date.endOf('year').toISOString();
            } else if (chartFilter === 'yearly') {
                startDate = date.clone().subtract(4, 'years').startOf('year').toISOString();
                endDate = date.endOf('year').toISOString();
            }

            const { data: logs, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('branch_id', branch.id)
                .gte('timestamp', startDate)
                .lte('timestamp', endDate)
                .order('timestamp', { ascending: true });

            if (error) throw error;

            let newData = [];

            // Process Data into Buckets
            if (chartFilter === 'daily') {
                // Bucket: Day of Week (Mon, Tue...) for the selected Week
                for (let i = 0; i < 7; i++) {
                    const currentDay = moment(startDate).add(i, 'days');
                    const dayLogs = logs.filter(l => moment(l.timestamp).isSame(currentDay, 'day'));

                    newData.push({
                        name: currentDay.format('ddd'), // Mon
                        fullDate: currentDay.format('YYYY-MM-DD'),
                        'Check-In': dayLogs.filter(l => l.action?.toLowerCase().includes('check-in')).length,
                        'Check-Out': dayLogs.filter(l => l.action?.toLowerCase().includes('check-out')).length
                    });
                }
            } else if (chartFilter === 'weekly') {
                // Bucket: Week of Month (Week 1, Week 2...)
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
            } else if (chartFilter === 'monthly') {
                // Bucket: Month of Year (Jan, Feb...)
                for (let i = 0; i < 12; i++) {
                    const currentMonth = moment(startDate).month(i);
                    const monthLogs = logs.filter(l => moment(l.timestamp).month() === i);

                    newData.push({
                        name: currentMonth.format('MMM'),
                        'Check-In': monthLogs.filter(l => l.action?.toLowerCase().includes('check-in')).length,
                        'Check-Out': monthLogs.filter(l => l.action?.toLowerCase().includes('check-out')).length
                    });
                }
            } else if (chartFilter === 'yearly') {
                // Bucket: Year (2022, 2023...)
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

            setChartData(newData);

        } catch (error) {
            console.error('Error fetching chart data:', error);
            toast.error('Failed to load chart data');
        } finally {
            setIsLoadingChart(false);
        }
    };

    if (!session) return null;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
            <Sidebar role="admin" />

            <div className="ml-64">
                <Topbar title="Analytics" subtitle={branch ? `${branch.name} Overview` : 'Select a Branch'} />

                <main className="p-8">
                    {!branch ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <Layout className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-500 font-medium">Please select a branch to view analytics.</p>
                        </div>
                    ) : (
                        <>
                            {/* Live/Today Stats Cards - Always Visible, No Filter */}
                            <div className="mb-8">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    Today's Overview
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <StatCard
                                        title="Active Patrons"
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
                                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex flex-col">

                                    {/* Chart Header with Integrated Filters */}
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">Activity Trends</h3>
                                            <p className="text-sm text-gray-500">
                                                {chartFilter === 'daily' ? 'Last 7 Days' :
                                                    chartFilter === 'weekly' ? 'Weeks of Month' :
                                                        chartFilter === 'monthly' ? 'Months of Year' : '5-Year Trend'}
                                            </p>
                                        </div>

                                        {/* Local 'Necessary' Analytics Filter */}
                                        <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                                            <select
                                                className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer"
                                                value={chartFilter}
                                                onChange={(e) => setChartFilter(e.target.value)}
                                            >
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                                <option value="yearly">Yearly</option>
                                            </select>

                                            {chartFilter !== 'yearly' && (
                                                <div className="border-l border-gray-300 mx-2"></div>
                                            )}

                                            {chartFilter !== 'yearly' && (
                                                <input
                                                    type={chartFilter === 'monthly' ? "month" : "date"}
                                                    className="bg-transparent border-none text-sm text-gray-600 focus:ring-0 p-0 w-32 cursor-pointer"
                                                    value={chartFilter === 'monthly' ? chartDate.slice(0, 7) : chartDate}
                                                    onChange={(e) => setChartDate(e.target.value)}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Chart Body */}
                                    <div className="flex-1 w-full min-h-[350px]">
                                        {isLoadingChart ? (
                                            <div className="h-full flex justify-center items-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                                    <XAxis
                                                        dataKey="name"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#6B7280', fontSize: 12 }}
                                                        dy={10}
                                                        interval={0}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#6B7280', fontSize: 12 }}
                                                    />
                                                    <Tooltip
                                                        cursor={{ fill: '#F9FAFB' }}
                                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                                    />
                                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                                    <Bar dataKey="Check-In" fill="#10B981" radius={[4, 4, 0, 0]} barSize={chartFilter === 'daily' ? 20 : 30} />
                                                    <Bar dataKey="Check-Out" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={chartFilter === 'daily' ? 20 : 30} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Busy Areas (Live Context - No Filter) */}
                                <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm h-full flex flex-col">
                                    <h3 className="text-lg font-semibold mb-2 text-gray-800 flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-gray-400" />
                                        Current Busy Areas
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-6">Real-time occupancy status</p>

                                    <div className="space-y-4 flex-1 overflow-y-auto">
                                        {!isLoadingStats && todayStats.busyAreas && todayStats.busyAreas.length > 0 ? (
                                            todayStats.busyAreas.map((area) => (
                                                <div key={area.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="font-medium text-gray-900 text-sm">{area.name}</p>
                                                            <p className="text-xs text-gray-500 mt-1">{area.count} / {area.capacity} people</p>
                                                        </div>
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${area.occupancyRate > 80 ? 'bg-red-100 text-red-600' :
                                                                area.occupancyRate > 50 ? 'bg-yellow-100 text-yellow-600' :
                                                                    'bg-green-100 text-green-600'
                                                            }`}>
                                                            {Math.round(area.occupancyRate)}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                                        <div
                                                            className={`h-1.5 rounded-full ${area.occupancyRate > 80 ? 'bg-red-500' :
                                                                    area.occupancyRate > 50 ? 'bg-yellow-500' :
                                                                        'bg-green-500'
                                                                }`}
                                                            style={{ width: `${Math.min(area.occupancyRate, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                                                <Layout className="w-8 h-8 mb-2 opacity-20" />
                                                <p>No active area data.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
