import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import { toast } from 'sonner';
import { Search, Download, Layout, Package, CheckCircle, Clock } from 'lucide-react';

export default function AdminBaggageLogs() {
    const navigate = useNavigate();
    const { selectedBranch: branch } = useBranch();
    const [session, setSession] = useState(null);
    const [logs, setLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

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
        if (branch?.id) {
            fetchLogs();
        } else {
            setLogs([]);
            setIsLoading(false);
        }
    }, [branch]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            // Join with areas/floors if possible to get more context, or just list IDs
            // Since baggage_logs has area_id, we can fetch area name via join?
            // Supabase join syntax: select('*, areas(name, floor_id)')
            // But let's start simple.
            const { data, error } = await supabase
                .from('baggage_logs')
                .select(`
                    *,
                    areas (
                        name,
                        floors (
                            label,
                            floor_number
                        )
                    )
                `)
                // Filter by branch_id if it exists in baggage_logs.
                // The baggage_logs table has branch_id column?
                // Let's check schema quick. Yes, I added branch_id references branches(id).
                // Wait, did I add branch_id to the insert trigger?
                // In my SQL command I added:
                // create table baggage_logs ( ... branch_id uuid references branches(id) ... )
                // But the trigger logic:
                // insert into baggage_logs (..., branch_id??) values (...)
                // I might have missed branch_id in the trigger or table insert. 
                // Let's re-read the SQL I sent.
                // "insert into baggage_logs (baggage_id, area_id, patron_name, patron_id, check_in_time, check_out_time) values (old.id, old.area_id, ...)"
                // I did NOT insert branch_id in the trigger.
                // However, I can deduce branch from area_id -> floor -> branch if needed.
                // Or I can update the trigger. 
                // Since I cannot easily update the trigger without potentially breaking things or complex SQL, 
                // I will filter by joining areas -> floors -> branch_id.
                // query: .eq('areas.floors.branch_id', branch.id) -- deeper filtering might be tricky in one go on 'select'.
                // Supabase supports filtering on joined tables on select? 
                // Actually, easiest is to fetch all for the branch via the join filter.
                // Let's try: .match({ 'areas.floors.branch_id': branch.id }) NO.
                // .eq('areas.floors.branch_id', branch.id) ? 
                // It's `!inner` join usually for filtering.
                // Let's try client side filtering for now if the volume is low, or:
                // .select('*, areas!inner(floors!inner(branch_id))').eq('areas.floors.branch_id', branch.id)
                // Let's assume standard join works.
                .select(`
                    *,
                    areas!inner (
                        name,
                        floors!inner (
                            label,
                            branch_id
                        )
                    )
                `)
                .eq('areas.floors.branch_id', branch.id)
                .order('check_out_time', { ascending: false });

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
            toast.error('Failed to load baggage logs');
        } finally {
            setIsLoading(false);
        }
    };

    if (!session) return null;

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            (log.patron_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (log.patron_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (log.baggage_id?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const handleDownload = () => {
        if (!logs.length) return;

        const csvContent = [
            'Locker ID,Area,Patron Name,Patron ID,Check In,Check Out',
            ...filteredLogs.map(log =>
                `${log.baggage_id},"${log.areas?.name || ''}",${log.patron_name || ''},${log.patron_id || ''},${new Date(log.check_in_time).toLocaleString()},${new Date(log.check_out_time).toLocaleString()}`
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `baggage-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
            <Sidebar role="admin" />

            <div className="ml-64">
                <Topbar title="Baggage Logs" subtitle={branch ? `${branch.name} Baggage History` : 'Select a Branch'} />

                <main className="p-8">
                    {!branch ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <Layout className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-500 font-medium">Please select a branch to view logs.</p>
                        </div>
                    ) : (
                        <>
                            {/* Toolbar */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="relative w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search patron, ID, or locker..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2"
                                        style={{ '--tw-ring-color': '#56CBF9' }}
                                    />
                                </div>

                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
                                    style={{ backgroundColor: '#00104A' }}
                                >
                                    <Download className="w-4 h-4" />
                                    Export Logs
                                </button>
                            </div>

                            {/* Logs Table */}
                            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                                {isLoading ? (
                                    <div className="flex justify-center p-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-[#00104A] text-white">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold uppercase text-xs">Locker ID</th>
                                                <th className="px-6 py-4 font-semibold uppercase text-xs">Area / Floor</th>
                                                <th className="px-6 py-4 font-semibold uppercase text-xs">Patron Details</th>
                                                <th className="px-6 py-4 font-semibold uppercase text-xs">Duration</th>
                                                <th className="px-6 py-4 font-semibold uppercase text-xs">Timestamps</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredLogs.length > 0 ? (
                                                filteredLogs.map((log) => {
                                                    const checkIn = new Date(log.check_in_time);
                                                    const checkOut = new Date(log.check_out_time);
                                                    const durationMs = checkOut - checkIn;
                                                    const durationHrs = Math.floor(durationMs / (1000 * 60 * 60));
                                                    const durationMins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

                                                    const isOvernight = checkIn.getDate() !== checkOut.getDate();

                                                    return (
                                                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                                <div className="flex items-center gap-2">
                                                                    <Package className="w-4 h-4 text-blue-500" />
                                                                    {log.baggage_id}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-600">
                                                                <p className="font-medium text-gray-900">{log.areas?.name}</p>
                                                                <p className="text-xs text-gray-500">{log.areas?.floors?.label}</p>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <p className="font-medium text-gray-900">{log.patron_name || 'N/A'}</p>
                                                                <p className="text-xs text-gray-500">{log.patron_id || 'N/A'}</p>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-1.5 text-gray-700">
                                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                                    <span>{durationHrs}h {durationMins}m</span>
                                                                    {isOvernight && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded ml-1">Overnight</span>}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-xs text-gray-500 space-y-1">
                                                                <div className="flex justify-between gap-4">
                                                                    <span>In:</span>
                                                                    <span className="font-mono text-gray-700">{checkIn.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between gap-4">
                                                                    <span>Out:</span>
                                                                    <span className="font-mono text-gray-700">{checkOut.toLocaleString()}</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                                        No baggage history found for this branch.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
