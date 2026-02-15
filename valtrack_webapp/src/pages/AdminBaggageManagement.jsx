import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import BranchSelector from '../components/BranchSelector';
import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import { toast } from 'sonner';
import {
    Download,
    Grid3X3,
    Search,
    User,
    Clock,
    Settings,
    Plus,
    AlertCircle,
    Layout,
    Package
} from 'lucide-react';

export default function AdminSlotManagement() {
    const navigate = useNavigate();
    const { selectedBranch: branch } = useBranch();
    const [session, setSession] = useState(null);

    // Selection State
    const [floors, setFloors] = useState([]);
    const [selectedFloorId, setSelectedFloorId] = useState(null);
    const [areas, setAreas] = useState([]);
    const [selectedAreaId, setSelectedAreaId] = useState(null);

    // Data State
    const [baggageList, setBaggageList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBaggage, setSelectedBaggage] = useState(null);

    // Config Modal
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [configCount, setConfigCount] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

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

    // Fetch Floors when branch changes
    useEffect(() => {
        fetchFloors();
    }, [branch]);

    // Fetch Areas when floor changes
    useEffect(() => {
        if (selectedFloorId) {
            fetchAreas();
        } else {
            setAreas([]);
        }
    }, [selectedFloorId]);

    // Fetch Baggage when area changes
    useEffect(() => {
        if (selectedAreaId) {
            fetchBaggage();
        } else {
            setBaggageList([]);
        }
    }, [selectedAreaId]);

    const fetchFloors = async () => {
        try {
            let query = supabase
                .from('floors')
                .select('*, branches(name)')
                .order('branch_id')
                .order('floor_number');

            if (branch?.id) {
                query = query.eq('branch_id', branch.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            setFloors(data || []);

            if (data && data.length > 0) {
                if (!selectedFloorId || !data.find(f => f.id === selectedFloorId)) {
                    setSelectedFloorId(data[0].id);
                }
            } else {
                setSelectedFloorId(null);
                setAreas([]);
                setBaggageList([]);
            }
        } catch (error) {
            console.error('Error fetching floors:', error);
            toast.error('Failed to load floors');
        }
    };

    const fetchAreas = async () => {
        try {
            const { data, error } = await supabase
                .from('areas')
                .select('*')
                .eq('floor_id', selectedFloorId)
                .order('name');

            if (error) throw error;
            setAreas(data || []);

            if (data && data.length > 0) {
                if (!selectedAreaId || !data.find(a => a.id === selectedAreaId)) {
                    setSelectedAreaId(data[0].id);
                }
            } else {
                setSelectedAreaId(null);
            }
        } catch (error) {
            console.error('Error fetching areas:', error);
        }
    };

    const [claimedTodayCount, setClaimedTodayCount] = useState(0);

    const fetchBaggage = async () => {
        setIsLoading(true);
        try {
            // Fetch Current Baggage
            const { data, error } = await supabase
                .from('baggage')
                .select('*')
                .eq('area_id', selectedAreaId)
                .order('id');

            if (error) throw error;
            setBaggageList(data || []);

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const { count, error: logError } = await supabase
                .from('baggage_logs')
                .select('*', { count: 'exact', head: true })
                .eq('area_id', selectedAreaId)
                .gte('check_out_time', todayStart.toISOString());

            if (logError) {
                console.error('Error fetching logs:', logError);
            } else {
                setClaimedTodayCount(count || 0);
            }

        } catch (error) {
            console.error('Error fetching baggage:', error);
            toast.error('Failed to load baggage data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!selectedAreaId) return;
        setIsSaving(true);
        try {
            const currentCount = baggageList.length;
            const targetCount = parseInt(configCount);

            if (targetCount < currentCount) {
                // Remove slots
                const slotsToRemove = baggageList.slice(targetCount);
                const occupied = slotsToRemove.filter(s => s.status === 'occupied');

                if (occupied.length > 0) {
                    toast.error(`Cannot remove slots: ${occupied.length} are currently occupied.`);
                    return;
                }

                const idsToRemove = slotsToRemove.map(s => s.id);
                const { error } = await supabase.from('baggage').delete().in('id', idsToRemove);
                if (error) throw error;

            } else if (targetCount > currentCount) {
                // Add slots
                const newSlots = [];
                for (let i = currentCount + 1; i <= targetCount; i++) {
                    newSlots.push({
                        id: `Locker-${selectedAreaId.slice(0, 4)}-${Date.now()}-${i}`,
                        area_id: selectedAreaId,
                        status: 'available'
                    });
                }
                const { error } = await supabase.from('baggage').insert(newSlots);
                if (error) throw error;
            }

            toast.success('Baggage lockers updated');
            fetchBaggage();
            setIsConfigModalOpen(false);
        } catch (error) {
            console.error('Error updating config:', error);
            toast.error('Failed to update configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownload = () => {
        const occupied = baggageList.filter(s => s.status === 'occupied');
        const csvContent = [
            'Locker ID,Status,Patron Name,Patron ID,Check-In Time',
            ...occupied.map(s =>
                `${s.id},${s.status},${s.patron_name || ''},${s.patron_id || ''},${s.check_in_time ? new Date(s.check_in_time).toLocaleString() : ''}`
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `baggage-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const filteredBaggage = baggageList.filter(b =>
        b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.patron_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.patron_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const occupiedCount = baggageList.filter(b => b.status === 'occupied').length;

    if (!session) return null;

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar role="admin" />
            <div className="ml-64">
                <Topbar
                    title="Baggage Management"
                    subtitle={branch ? `${branch.name} Baggage Lockers` : 'All Branches Baggage Config'}
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
                    {/* Filters: Floor -> Area */}
                    <div className="mb-8 space-y-4">
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {floors.map(floor => (
                                <button
                                    key={floor.id}
                                    onClick={() => setSelectedFloorId(floor.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${selectedFloorId === floor.id
                                        ? 'bg-[#00104A] text-white shadow-md'
                                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                        }`}
                                >
                                    {!branch && floor.branches ? `${floor.branches.name} - ` : ''}
                                    {floor.label || `Floor ${floor.floor_number}`}
                                </button>
                            ))}
                            {floors.length === 0 && (
                                <p className="text-gray-400 italic text-sm">No floors found.</p>
                            )}
                        </div>

                        {selectedFloorId && areas.length > 0 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {areas.map(area => (
                                    <button
                                        key={area.id}
                                        onClick={() => setSelectedAreaId(area.id)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${selectedAreaId === area.id
                                            ? 'bg-[#56CBF9] text-white shadow-sm'
                                            : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
                                            }`}
                                    >
                                        {area.name}
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedFloorId && areas.length === 0 && (
                            <p className="text-gray-400 italic text-xs">No areas found in this floor.</p>
                        )}
                    </div>

                    {/* Content */}
                    {selectedAreaId ? (
                        <>
                            {/* Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm text-gray-500">Total Overdue Items</p>
                                            <p className="text-3xl font-bold text-red-600">
                                                {baggageList.filter(b => {
                                                    if (b.status !== 'occupied' || !b.check_in_time) return false;
                                                    const checkInDate = new Date(b.check_in_time);
                                                    const todayMidnight = new Date();
                                                    todayMidnight.setHours(0, 0, 0, 0);
                                                    return checkInDate < todayMidnight;
                                                }).length}
                                            </p>
                                            <p className="text-xs text-red-400 mt-1">Items left overnight</p>
                                        </div>
                                        <div className="p-3 bg-red-50 rounded-xl">
                                            <AlertCircle className="w-6 h-6 text-red-500" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm text-gray-500">Total Claimed Today</p>
                                            <p className="text-3xl font-bold text-green-600">{claimedTodayCount}</p>
                                        </div>
                                        <div className="p-3 bg-green-50 rounded-xl">
                                            <Package className="w-6 h-6 text-green-500" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm text-gray-500">Total Current Deposited</p>
                                            <p className="text-3xl font-bold text-amber-500">{occupiedCount}</p>
                                        </div>
                                        <div className="p-3 bg-amber-50 rounded-xl">
                                            <User className="w-6 h-6 text-amber-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Row */}
                            <div className="flex justify-between items-center mb-6">
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search lockers..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#56CBF9]"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setConfigCount(baggageList.length);
                                            setIsConfigModalOpen(true);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Configure
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#00104A] text-white rounded-lg hover:opacity-90 font-medium"
                                    >
                                        <Download className="w-4 h-4" />
                                        Export Report
                                    </button>
                                </div>
                            </div>

                            {/* Grid */}
                            {isLoading ? (
                                <div className="py-20 flex justify-center">
                                    <div className="w-8 h-8 border-4 border-gray-200 border-t-[#00104A] rounded-full animate-spin" />
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {filteredBaggage.map((item, idx) => (
                                            <div
                                                key={item.id}
                                                onClick={() => item.status === 'occupied' && setSelectedBaggage(item)}
                                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 ${item.status === 'occupied'
                                                    ? 'border-amber-200 bg-amber-50'
                                                    : 'border-green-200 bg-green-50'
                                                    }`}
                                            >
                                                <div className="flex flex-col items-center gap-2">
                                                    <Package className={`w-6 h-6 ${item.status === 'occupied' ? 'text-amber-500' : 'text-green-500'}`} />
                                                    <div className="text-center">
                                                        <span className="font-bold text-gray-800">#{idx + 1}</span>
                                                        <p className={`text-xs font-medium uppercase mt-1 ${item.status === 'occupied' ? 'text-amber-600' : 'text-green-600'
                                                            }`}>
                                                            {item.status}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredBaggage.length === 0 && (
                                            <div className="col-span-full py-12 text-center text-gray-400">
                                                No lockers found matching your search.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <Grid3X3 className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-500 font-medium">Please select a Floor and Area to manage baggage.</p>
                        </div>
                    )}
                </main>
            </div>

            {/* Configure Modal */}
            <Modal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                title="Configure Lockers"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Adjust the number of lockers available in <strong>{areas.find(a => a.id === selectedAreaId)?.name}</strong>.
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Quantity</label>
                        <input
                            type="number"
                            min="0"
                            value={configCount}
                            onChange={(e) => setConfigCount(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#56CBF9]"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={() => setIsConfigModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveConfig}
                            disabled={isSaving}
                            className="px-4 py-2 bg-[#00104A] text-white rounded-lg hover:opacity-90 font-medium disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Update Quantity'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Details Modal */}
            <Modal
                isOpen={!!selectedBaggage}
                onClose={() => setSelectedBaggage(null)}
                title="Locker Details"
            >
                {selectedBaggage && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500">Locker ID</p>
                                <p className="font-semibold text-gray-900 truncate" title={selectedBaggage.id}>{selectedBaggage.id}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500">Status</p>
                                <p className="font-semibold text-amber-600 capitalize">{selectedBaggage.status}</p>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                            <h4 className="font-medium text-gray-900 mb-3">Patron Information</h4>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <User className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{selectedBaggage.patron_name || 'N/A'}</p>
                                        <p className="text-xs text-gray-500">{selectedBaggage.patron_id || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Check-in Time</p>
                                        <p className="text-xs text-gray-500">
                                            {selectedBaggage.check_in_time
                                                ? new Date(selectedBaggage.check_in_time).toLocaleString()
                                                : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}