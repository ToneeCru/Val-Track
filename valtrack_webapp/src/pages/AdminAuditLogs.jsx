import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import BranchSelector from '../components/BranchSelector';
import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import { toast } from 'sonner';
import { Search, Filter, Download, Layout } from 'lucide-react';

const moduleColors = {
    'User Management': { bg: '#00104A15', color: '#00104A' },
    'QR Scan': { bg: '#56CBF915', color: '#0891B2' },
    'Baggage Module': { bg: '#F59E0B15', color: '#F59E0B' },
    'Slot Management': { bg: '#8B5CF615', color: '#8B5CF6' },
    'Baggage Management': { bg: '#8B5CF615', color: '#8B5CF6' },
    'Incidents': { bg: '#FF2B2B15', color: '#FF2B2B' },
    'System': { bg: '#64748B15', color: '#64748B' },
    'Floor Management': { bg: '#10B98115', color: '#10B981' },
    'Area Management': { bg: '#10B98115', color: '#10B981' },
};

export default function AdminAuditLogs() {
    const navigate = useNavigate();
    const { selectedBranch: branch } = useBranch();
    const [session, setSession] = useState(null);
    const [logs, setLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterModule, setFilterModule] = useState('all');
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
        fetchLogs();
    }, [branch]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('audit_logs')
                .select('*')
                .order('timestamp', { ascending: false });

            if (branch?.id) {
                // If a branch is selected, show logs for that branch OR system logs (null branch)
                // Actually, if we want to filter by branch strictly, we should just use .eq
                // But previously it was .or(`branch_id.eq.${branch.id},branch_id.is.null`)
                // Let's keep that logic if a branch is selected.
                query = query.or(`branch_id.eq.${branch.id},branch_id.is.null`);
            }
            // If branch is null (All Branches), we just fetch everything, so no filter needed.

            const { data, error } = await query;

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
            toast.error('Failed to load audit logs');
        } finally {
            setIsLoading(false);
        }
    };

    if (!session) return null;

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.details?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesModule = filterModule === 'all' || log.module === filterModule;
        return matchesSearch && matchesModule;
    });

    const modules = [...new Set(logs.map(log => log.module))];

    const handleDownload = async () => {
        if (!logs.length) return;

        const csvContent = [
            'User,Action,Module,Details,Timestamp',
            ...filteredLogs.map(log =>
                `${log.user_name},"${log.action}",${log.module},"${log.details}",${new Date(log.timestamp).toLocaleString()}`
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        // Record the download action
        try {
            await supabase.from('audit_logs').insert({
                user_name: session.name || 'Admin',
                branch_id: branch?.id || null, // Handle null branch
                action: 'Export Reports',
                module: 'Audit Logs',
                details: `Exported ${filteredLogs.length} audit trail records as CSV`,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error('Failed to log export:', err);
        }
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
            <Sidebar role="admin" />

            <div className="ml-64">
                <Topbar title="Audit Logs" subtitle={branch ? `${branch.name} Activity Log` : 'All Branches Activity Log'} />

                <div className="px-8 pt-6">
                    <div className="flex justify-end">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 font-medium">Viewing Data For:</span>
                            <BranchSelector />
                        </div>
                    </div>
                </div>

                <main className="p-8">
                    {/* Filters */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="relative w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search logs..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2"
                                    style={{ '--tw-ring-color': '#56CBF9' }}
                                />
                            </div>

                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <select
                                    value={filterModule}
                                    onChange={(e) => setFilterModule(e.target.value)}
                                    className="pl-10 pr-8 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 appearance-none bg-white"
                                    style={{ '--tw-ring-color': '#56CBF9' }}
                                >
                                    <option value="all">All Modules</option>
                                    {modules.map(module => (
                                        <option key={module} value={module}>{module}</option>
                                    ))}
                                </select>
                            </div>
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
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr style={{ backgroundColor: '#00104A' }}>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">User</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">Action</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">Module</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">Details</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredLogs.length > 0 ? (
                                        filteredLogs.map((log) => {
                                            const moduleStyle = moduleColors[log.module] || { bg: '#E5E7EB', color: '#6B7280' };
                                            return (
                                                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className="font-medium text-sm" style={{ color: '#232323' }}>{log.user_name}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm" style={{ color: '#232323' }}>{log.action}</td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                                                            style={{ backgroundColor: moduleStyle.bg, color: moduleStyle.color }}
                                                        >
                                                            {log.module}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">{log.details}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                                No logs found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}