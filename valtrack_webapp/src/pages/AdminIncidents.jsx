import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import StatusBadge from '../components/StatusBadge';
import {
    AlertTriangle,
    Search,
    FileText,
    CheckCircle,
    Download,
    Layout
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import { toast } from 'sonner';
import moment from 'moment';

export default function AdminIncidents() {
    const navigate = useNavigate();
    const { selectedBranch: branch } = useBranch();
    const [session, setSession] = useState(null);
    const [incidents, setIncidents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

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
            fetchIncidents();
        } else {
            setIncidents([]);
        }
    }, [branch]);

    const fetchIncidents = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('incidents')
                .select('*, areas(name, floor_id)')
                .eq('branch_id', branch.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setIncidents(data || []);
        } catch (error) {
            console.error('Error fetching incidents:', error);
            toast.error('Failed to load incidents');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResolve = async (id) => {
        try {
            const { error } = await supabase
                .from('incidents')
                .update({
                    status: 'resolved',
                    resolved_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            // Audit log
            const inc = incidents.find(i => i.id === id);
            await supabase.from('audit_logs').insert({
                user_name: session.name || session.username,
                branch_id: branch.id,
                action: 'Resolve Incident',
                module: 'Incidents',
                details: `Resolved incident #${id} (${inc?.type || 'unknown type'})`,
                timestamp: new Date().toISOString()
            });

            toast.success('Incident marked as resolved');
            fetchIncidents();
        } catch (error) {
            console.error('Error resolving incident:', error);
            toast.error('Failed to resolve incident');
        }
    };

    const handleDownloadCSV = async () => {
        if (!incidents.length) return;

        const csvContent = [
            'ID,Patron,Type,Description,Area,Status,Date',
            ...incidents.map(inc =>
                `"${inc.id}","${inc.patron_name}","${inc.type}","${inc.description}","${inc.areas?.name || 'N/A'}","${inc.status}","${moment(inc.created_at).format('YYYY-MM-DD HH:mm:ss')}"`
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `incident-report-${moment().format('YYYY-MM-DD')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const filteredIncidents = incidents.filter(inc => {
        const matchesSearch =
            (inc.patron_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (inc.patron_id?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (inc.description?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = filterStatus === 'all' || inc.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (!session) return null;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
            <Sidebar role="admin" />

            <div className="ml-64">
                <Topbar title="Incident & Exception" subtitle={branch ? `${branch.name} Incidents` : 'Select a Branch'} />

                <main className="p-8">
                    {!branch ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <Layout className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-500 font-medium">Please select a branch to view incidents.</p>
                        </div>
                    ) : (
                        <>
                            {/* Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-2">
                                        <AlertTriangle className="w-5 h-5" style={{ color: '#FF2B2B' }} />
                                        <span className="text-sm text-gray-500">Open Incidents</span>
                                    </div>
                                    <p className="text-3xl font-bold" style={{ color: '#FF2B2B' }}>
                                        {incidents.filter(i => i.status === 'open').length}
                                    </p>
                                </div>
                                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-2">
                                        <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                                        <span className="text-sm text-gray-500">Resolved</span>
                                    </div>
                                    <p className="text-3xl font-bold" style={{ color: '#10B981' }}>
                                        {incidents.filter(i => i.status === 'resolved').length}
                                    </p>
                                </div>
                                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-2">
                                        <FileText className="w-5 h-5" style={{ color: '#56CBF9' }} />
                                        <span className="text-sm text-gray-500">Total Reports</span>
                                    </div>
                                    <p className="text-3xl font-bold" style={{ color: '#232323' }}>{incidents.length}</p>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="relative w-80">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search incidents..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2"
                                            style={{ '--tw-ring-color': '#56CBF9' }}
                                        />
                                    </div>

                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2"
                                        style={{ '--tw-ring-color': '#56CBF9' }}
                                    >
                                        <option value="all">All Status</option>
                                        <option value="open">Open</option>
                                        <option value="resolved">Resolved</option>
                                    </select>
                                </div>

                                <button
                                    onClick={handleDownloadCSV}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium transition-all hover:bg-gray-50 shadow-sm"
                                >
                                    <Download className="w-4 h-4 text-gray-800" />
                                    Export CSV
                                </button>
                            </div>

                            {/* Incidents Table */}
                            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                                {isLoading ? (
                                    <div className="p-12 flex justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead>
                                            <tr style={{ backgroundColor: '#00104A' }}>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">Patron</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">Type</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">Description</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">Area</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">Status</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">Date</th>
                                                <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredIncidents.length > 0 ? filteredIncidents.map((incident) => (
                                                <tr key={incident.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <p className="font-medium text-sm" style={{ color: '#232323' }}>{incident.patron_name}</p>
                                                            <p className="text-xs text-gray-500">{incident.patron_id}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                                                            style={{ backgroundColor: '#00104A15', color: '#00104A' }}
                                                        >
                                                            {incident.type?.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                                        {incident.description}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm" style={{ color: '#232323' }}>
                                                        {incident.areas?.name || 'Unknown Area'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <StatusBadge status={incident.status} />
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {moment(incident.created_at).format('MMM DD, YYYY')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {incident.status === 'open' && (
                                                            <button
                                                                onClick={() => handleResolve(incident.id)}
                                                                className="px-3 py-1 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 shadow-sm"
                                                                style={{ backgroundColor: '#10B981' }}
                                                            >
                                                                Resolve
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                                                        No incident reports found.
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
