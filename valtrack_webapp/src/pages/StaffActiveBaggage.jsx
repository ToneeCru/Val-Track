import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import {
    Package,
    Download,
    Search,
    MapPin,
    Clock,
    Building2,
    Filter
} from 'lucide-react';
import { useBranch } from '../context/BranchContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export default function StaffActiveBaggage() {
    const navigate = useNavigate();
    const { selectedBranch } = useBranch();
    const [session, setSession] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterArea, setFilterArea] = useState('all');

    const [areas, setAreas] = useState([]);
    const [activeBaggage, setActiveBaggage] = useState([]);
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

    // Fetch Areas and Baggage when branch changes
    useEffect(() => {
        if (selectedBranch?.id) {
            fetchData();
        }
    }, [selectedBranch]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Areas for filtering and mapping
            const { data: floors } = await supabase.from('floors').select('id').eq('branch_id', selectedBranch.id);
            const floorIds = floors?.map(f => f.id) || [];

            let branchAreas = [];
            if (floorIds.length > 0) {
                const { data: areaData } = await supabase
                    .from('areas')
                    .select('*, floors(label, floor_number)')
                    .in('floor_id', floorIds)
                    .order('name');
                branchAreas = areaData || [];
            }
            setAreas(branchAreas);

            // 2. Fetch Active Baggage for ALL areas in branch
            const areaIds = branchAreas.map(a => a.id);
            if (areaIds.length > 0) {
                const { data: baggageData, error } = await supabase
                    .from('baggage')
                    .select('*')
                    .in('area_id', areaIds)
                    .eq('status', 'occupied')
                    .order('check_in_time', { ascending: false });

                if (error) throw error;

                // Enrich baggage data with area info manually or via join if we used join in query
                // (Supabase join notation: select('*, areas(*)') )
                // Let's just map it since we have areas list
                const enriched = baggageData.map(b => {
                    const area = branchAreas.find(a => a.id === b.area_id);
                    return { ...b, area };
                });

                setActiveBaggage(enriched || []);
            } else {
                setActiveBaggage([]);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            // toast.error('Failed to load active baggage');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredBaggage = activeBaggage.filter(item => {
        const matchesSearch =
            (item.patron_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.patron_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.id || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesArea = filterArea === 'all' || item.area_id === filterArea;
        return matchesSearch && matchesArea;
    });

    const handleDownload = () => {
        const csvContent = [
            'Locker ID,Patron Name,Patron ID,Area,Floor,Check-In Time',
            ...filteredBaggage.map(item =>
                `${item.id},"${item.patron_name}",${item.patron_id},"${item.area?.name || 'Unknown'}",${item.area?.floors?.label || item.area?.floors?.floor_number || ''},${new Date(item.check_in_time).toLocaleString()}`
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `active-baggage-${selectedBranch?.name || 'branch'}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (!session) return null;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
            <Sidebar role="staff" />

            <div className="ml-64">
                <Topbar title="Active Baggage List" subtitle={`Currently stored items in ${selectedBranch?.name || '...'}`} />

                <main className="p-8">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-xl p-6 border border-gray-100 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Package className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm text-gray-500 font-medium">Total Active</span>
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{activeBaggage.length}</p>
                            </div>
                        </div>

                        {/* Optional: Break down by Area if few areas, else just total */}
                        {/* Let's show filtered count */}
                        <div className="bg-white rounded-xl p-6 border border-gray-100 flex items-center justify-between col-span-2">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Filter className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-500 font-medium">Filtered Result</span>
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{filteredBaggage.length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, ID, or locker..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#56CBF9] transition-all"
                                />
                            </div>

                            <div className="relative">
                                <select
                                    value={filterArea}
                                    onChange={(e) => setFilterArea(e.target.value)}
                                    className="appearance-none px-4 py-2 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#56CBF9] bg-white cursor-pointer"
                                >
                                    <option value="all">All Areas</option>
                                    {areas.map(area => (
                                        <option key={area.id} value={area.id}>{area.name}</option>
                                    ))}
                                </select>
                                <Filter className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90 shadow-sm"
                            style={{ backgroundColor: '#00104A' }}
                        >
                            <Download className="w-4 h-4" />
                            Download CSV
                        </button>
                    </div>

                    {/* Baggage Table */}
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Locker Info</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patron</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-In Time</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center">
                                                <div className="flex justify-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#56CBF9]"></div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredBaggage.length > 0 ? (
                                        filteredBaggage.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                                        {item.id}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-700 text-xs font-bold">
                                                            {item.patron_name?.charAt(0) || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{item.patron_name}</p>
                                                            <p className="text-xs text-gray-500 font-mono">{item.patron_id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                                            <MapPin className="w-3 h-3 text-gray-400" />
                                                            {item.area?.name || 'Unknown Area'}
                                                        </span>
                                                        <span className="text-xs text-gray-500 ml-4">
                                                            {item.area?.floors?.label || `Floor ${item.area?.floors?.floor_number}`}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <Clock className="w-4 h-4 text-gray-400" />
                                                        {new Date(item.check_in_time).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Active
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">
                                                No active baggage found matching your criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}