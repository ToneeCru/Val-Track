import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import {
    AlertTriangle,
    Plus,
    Search,
    QrCode,
    Scan,
    FileText,
    CheckCircle,
    MapPin
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import { toast } from 'sonner';

const incidentTypes = [
    { value: 'lost_item', label: 'Lost Item' },
    { value: 'damaged_item', label: 'Damaged Item' },
    { value: 'policy_violation', label: 'Policy Violation' },
    { value: 'medical', label: 'Medical Emergency' },
    { value: 'other', label: 'Other' },
];

export default function StaffIncidents() {
    const navigate = useNavigate();
    const { selectedBranch } = useBranch();
    const [session, setSession] = useState(null);
    const [incidents, setIncidents] = useState([]);

    // Form / Modal State
    const [activePatrons, setActivePatrons] = useState([]);
    const [areas, setAreas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [selectedPatron, setSelectedPatron] = useState(null);
    const [formData, setFormData] = useState({
        type: 'lost_item',
        description: '',
        area_id: '',
    });

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

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

    // Fetch data when branch changes
    useEffect(() => {
        if (selectedBranch?.id && session) {
            fetchIncidents();
            fetchAreas();
        }
    }, [selectedBranch, session]);

    // Fetch active patrons when modal opens
    useEffect(() => {
        if (isModalOpen && selectedBranch?.id) {
            fetchActivePatrons();
        }
    }, [isModalOpen, selectedBranch]);

    const fetchIncidents = async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('incidents')
                .select('*')
                .eq('branch_id', selectedBranch.id);

            if (session.assigned_area_id) {
                query = query.eq('area_id', session.assigned_area_id);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            setIncidents(data || []);
        } catch (error) {
            console.error('Error fetching incidents:', error);
            // toast.error('Failed to load incidents');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAreas = async () => {
        try {
            let areaQuery = supabase.from('areas').select('*, floors(label, floor_number)');

            if (session.assigned_area_id) {
                areaQuery = areaQuery.eq('id', session.assigned_area_id);
            } else if (session.assigned_floor_id) {
                areaQuery = areaQuery.eq('floor_id', session.assigned_floor_id);
            } else {
                const { data: floors } = await supabase.from('floors').select('id').eq('branch_id', selectedBranch.id);
                const floorIds = floors?.map(f => f.id) || [];
                if (floorIds.length > 0) {
                    areaQuery = areaQuery.in('floor_id', floorIds);
                } else {
                    setAreas([]);
                    return;
                }
            }

            const { data: areaData } = await areaQuery.order('name');
            setAreas(areaData || []);
        } catch (error) {
            console.error("Error fetching areas", error);
        }
    };

    const fetchActivePatrons = async () => {
        try {
            // Need to get patrons in any area of this branch
            const areaIds = areas.map(a => a.id);
            if (areaIds.length === 0) {
                setActivePatrons([]);
                return;
            }

            const { data, error } = await supabase
                .from('area_attendance')
                .select('patron_id, patron_name, area_id')
                .eq('status', 'active')
                .in('area_id', areaIds);

            if (error) throw error;

            // Remove duplicates (though ideally patron is only in one place)
            // Enhanced: Keep area info to auto-select area in form
            const uniquePatrons = [];
            const seenIds = new Set();

            data.forEach(p => {
                if (!seenIds.has(p.patron_id)) {
                    seenIds.add(p.patron_id);
                    uniquePatrons.push(p);
                }
            });

            setActivePatrons(uniquePatrons);
        } catch (error) {
            console.error('Error fetching patrons:', error);
        }
    };

    const handleSelectPatron = (patron) => {
        setSelectedPatron(patron);
        // Auto-select area if possible
        if (patron.area_id) {
            setFormData(prev => ({ ...prev, area_id: patron.area_id }));
        }
    };

    const handleSubmitIncident = async () => {
        if (!selectedPatron || !formData.description) return;
        setIsSaving(true);

        try {
            // Find area name for storing simple string if needed, but better to store area_id if schema supports.
            // Old schema had `floor` column. New schema should have `area_id`.
            // Let's check Supabase schema or assume we store `area_id` and `branch_id`.
            // Standardizing: Insert into `incidents` with `branch_id` and `area_id` (if added) or just `floor` text if legacy.
            // I updated `AdminIncidents` to use `branch_id`. I should ensure `incidents` table has `area_id`.
            // If not, I'll store area name in `floor` column for backward compat or just rely on branch.

            const selectedAreaObj = areas.find(a => a.id === formData.area_id);
            // Fallback: store area name in 'floor' column (type text/int varies, usually int for floor number).
            // Actually `incidents` table likely has `floor` as int or text. 
            // Better to use `metadata` or add column. 
            // For now, let's assume I can add `branch_id`. 
            // I'll add `branch_id` to the insert.

            const payload = {
                patron_id: selectedPatron.patron_id,
                patron_name: selectedPatron.patron_name,
                type: formData.type,
                description: formData.description,
                status: 'open',
                reported_by: session.name || session.username,
                created_at: new Date().toISOString(),
                branch_id: selectedBranch.id,
                area_id: formData.area_id || null, // Ensure area_id is saved
                // If the table expects 'floor' (int), we might just pass 1 or selectedArea floor_number
                floor: selectedAreaObj?.floors?.floor_number || 1
            };

            // Note: If I modified schema to add area_id, I should use it. 
            // Assuming I didn't modify `incidents` schema yet other than adding branch_id via SQL manually or earlier?
            // "Backend Schema Updates" in Next Steps suggests I verify tables.
            // I'll stick to `branch_id`. I can put Area Name in description or assume schema update later.
            // Let's prepend Area to description for clarity if we lack column.
            if (selectedAreaObj) {
                payload.description = `[${selectedAreaObj.name}] ${payload.description}`;
            }

            const { error: incidentError } = await supabase
                .from('incidents')
                .insert(payload);

            if (incidentError) throw incidentError;

            // Audit log
            await supabase.from('audit_logs').insert({
                user_name: session.name || session.username,
                action: 'Report Incident',
                module: 'Incidents',
                details: `Reported ${formData.type} for ${selectedPatron.patron_name}`,
                timestamp: new Date().toISOString(),
                branch_id: selectedBranch.id
            });

            toast.success('Incident reported successfully');
            setIsModalOpen(false);
            setSelectedPatron(null);
            setFormData({ type: 'lost_item', description: '', area_id: '' });
            fetchIncidents();
        } catch (error) {
            console.error('Error submitting incident:', error);
            toast.error('Failed to report incident');
        } finally {
            setIsSaving(false);
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
                action: 'Resolve Incident',
                module: 'Incidents',
                details: `Resolved incident #${id}`,
                timestamp: new Date().toISOString(),
                branch_id: selectedBranch.id
            });

            toast.success('Incident resolved');
            fetchIncidents();
        } catch (error) {
            console.error('Error resolving incident:', error);
            toast.error('Failed to resolve incident');
        }
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
            <Sidebar role="staff" />

            <div className="ml-64">
                <Topbar title="Incident & Exception" subtitle={`Manage incidents for ${selectedBranch?.name || '...'}`} />

                <main className="p-8">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-xl p-6 border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-3xl font-bold text-red-600">
                                    {incidents.filter(i => i.status === 'open').length}
                                </p>
                                <span className="text-sm text-gray-500">Open Incidents</span>
                            </div>
                            <div className="p-3 bg-red-50 rounded-lg">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-3xl font-bold text-green-600">
                                    {incidents.filter(i => i.status === 'resolved').length}
                                </p>
                                <span className="text-sm text-gray-500">Resolved</span>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                                <CheckCircle className="w-6 h-6 text-green-500" />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-3xl font-bold text-gray-800">
                                    {incidents.length}
                                </p>
                                <span className="text-sm text-gray-500">Total Reports</span>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <FileText className="w-6 h-6 text-blue-500" />
                            </div>
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
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#56CBF9]"
                                />
                            </div>

                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#56CBF9]"
                            >
                                <option value="all">All Status</option>
                                <option value="open">Open</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </div>

                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90 shadow-sm"
                            style={{ backgroundColor: '#00104A' }}
                        >
                            <Plus className="w-4 h-4" />
                            Report Incident
                        </button>
                    </div>

                    {/* Incidents Table */}
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                        <table className="w-full">
                            <thead>
                                <tr style={{ backgroundColor: '#00104A' }}>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">Patron</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">Description</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase">Date</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredIncidents.length > 0 ? (
                                    filteredIncidents.map((incident) => (
                                        <tr key={incident.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-sm text-gray-900">{incident.patron_name}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{incident.patron_id}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                                                    {incident.type?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={incident.description}>
                                                {incident.description}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={incident.status} />
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(incident.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {incident.status === 'open' && (
                                                    <button
                                                        onClick={() => handleResolve(incident.id)}
                                                        className="px-3 py-1 rounded-lg text-xs font-medium text-white transition-all hover:bg-emerald-600 bg-emerald-500"
                                                    >
                                                        Resolve
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-400 italic">
                                            No incidents found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>

            {/* Report Incident Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedPatron(null);
                    setFormData({ type: 'lost_item', description: '', area_id: '' });
                }}
                title="Report New Incident"
                size="lg"
            >
                <div className="space-y-6">
                    {/* Active Patrons Selector */}
                    <div>
                        <label className="block text-sm font-medium mb-3 text-gray-900">
                            <div className="flex items-center gap-2">
                                <Scan className="w-4 h-4 text-blue-500" />
                                Select Active Patron (Auto-filled from attendance)
                            </div>
                        </label>
                        <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar p-1 border border-gray-100 rounded-lg bg-gray-50">
                            {activePatrons.length > 0 ? activePatrons.map((patron) => (
                                <button
                                    key={patron.patron_id}
                                    onClick={() => handleSelectPatron(patron)}
                                    className={`p-3 rounded-lg border text-left transition-all ${selectedPatron?.patron_id === patron.patron_id
                                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                        : 'border-white bg-white hover:border-blue-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                            {patron.patron_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 truncate">{patron.patron_name}</p>
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <MapPin className="w-3 h-3" />
                                                {areas.find(a => a.id === patron.area_id)?.name || 'Unknown Area'}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            )) : (
                                <div className="col-span-full py-8 text-center text-gray-400 italic">
                                    No active patrons found in this branch.
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedPatron && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Incident Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {incidentTypes.map((type) => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Area Location</label>
                                    <select
                                        value={formData.area_id}
                                        onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select Area</option>
                                        {areas.map((area) => (
                                            <option key={area.id} value={area.id}>{area.name}</option> // floors.label?
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                                    placeholder="Provide details about the incident..."
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmitIncident}
                            disabled={!selectedPatron || !formData.description || isSaving}
                            className="px-4 py-2 bg-[#00104A] text-white rounded-lg hover:opacity-90 font-medium disabled:opacity-50 transition-all shadow-sm"
                        >
                            {isSaving ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}