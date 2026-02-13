import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import { toast } from 'sonner';
import {
    Users,
    Settings,
    Plus,
    Trash2,
    Edit2,
    Layout,
    ArrowUpRight,
    MapPin,
    Layers,
    Save, // Added Save icon
    X     // Added X icon
} from 'lucide-react';

export default function AdminFloorCapacity() {
    const navigate = useNavigate();
    const { selectedBranch: branch } = useBranch();
    const [session, setSession] = useState(null);

    // Data State
    const [floors, setFloors] = useState([]);
    const [selectedFloorId, setSelectedFloorId] = useState(null);
    const [areas, setAreas] = useState([]);
    const [attendanceCounts, setAttendanceCounts] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    // Floor Modal State
    const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
    const [newFloorNum, setNewFloorNum] = useState('');
    const [newFloorLabel, setNewFloorLabel] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);

    // NEW: Floor Editing State
    const [editingFloorId, setEditingFloorId] = useState(null);
    const [editFloorLabel, setEditFloorLabel] = useState('');

    // Area Modal State
    const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
    const [editingArea, setEditingArea] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'General Library',
        capacity: 50
    });
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
        if (branch?.id) {
            fetchFloors();
        } else {
            setFloors([]);
            setAreas([]);
        }
    }, [branch]);

    // Fetch Areas when selected floor changes
    useEffect(() => {
        if (selectedFloorId) {
            fetchAreas();
        }
    }, [selectedFloorId]);

    const fetchFloors = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('floors')
                .select('*')
                .eq('branch_id', branch.id)
                .order('floor_number');

            if (error) throw error;
            setFloors(data || []);

            if (data && data.length > 0) {
                // Check if current selectedFloorId is valid for this branch
                const currentFloorStillValid = data.find(f => f.id === selectedFloorId);

                if (!selectedFloorId || !currentFloorStillValid) {
                    setSelectedFloorId(data[0].id);
                }
            } else {
                setSelectedFloorId(null);
                setAreas([]);
            }
        } catch (error) {
            console.error('Error fetching floors:', error);
            toast.error('Failed to load floors');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAreas = async () => {
        if (!selectedFloorId) return;
        setIsLoading(true);
        try {
            // 1. Fetch Areas
            const { data: areasData, error: areasError } = await supabase
                .from('areas')
                .select('*')
                .eq('floor_id', selectedFloorId)
                .order('name');

            if (areasError) throw areasError;
            setAreas(areasData || []);

            // 2. Fetch Attendance Counts (Active only)
            // We need to count status='active' in area_attendance for each area
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('area_attendance')
                .select('area_id')
                .eq('status', 'active')
                .in('area_id', areasData.map(a => a.id));

            if (attendanceError) throw attendanceError;

            // Aggregate counts
            const counts = {};
            attendanceData.forEach(row => {
                counts[row.area_id] = (counts[row.area_id] || 0) + 1;
            });
            setAttendanceCounts(counts);

        } catch (error) {
            console.error('Error fetching areas:', error);
            toast.error('Failed to load areas');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Floor Management ---
    const handleAddFloor = async () => {
        if (!newFloorNum) return toast.error('Floor number is required');

        setIsActionLoading(true);
        try {
            const { error } = await supabase.from('floors').insert({
                branch_id: branch.id,
                floor_number: parseInt(newFloorNum),
                label: newFloorLabel || `Floor ${newFloorNum}`
            });
            if (error) throw error;
            toast.success('Floor added');
            setNewFloorNum('');
            setNewFloorLabel('');
            fetchFloors();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteFloor = async (id) => {
        if (!confirm('Delete this floor? This will delete all areas and baggage within it.')) return;
        try {
            const { error } = await supabase.from('floors').delete().eq('id', id);
            if (error) throw error;
            toast.success('Floor deleted');
            if (selectedFloorId === id) setSelectedFloorId(null);
            fetchFloors();
        } catch (error) {
            toast.error(error.message);
        }
    };

    // NEW: Floor Update Handlers
    const startEditingFloor = (floor) => {
        setEditingFloorId(floor.id);
        setEditFloorLabel(floor.label);
    };

    const cancelEditingFloor = () => {
        setEditingFloorId(null);
        setEditFloorLabel('');
    };

    const saveFloorLabel = async (floorId) => {
        if (!editFloorLabel.trim()) {
            toast.error("Label cannot be empty");
            return;
        }

        try {
            const { error } = await supabase
                .from('floors')
                .update({ label: editFloorLabel.trim() })
                .eq('id', floorId);

            if (error) throw error;

            toast.success('Floor updated');
            setEditingFloorId(null);
            fetchFloors(); // Refresh list to show new label
        } catch (error) {
            console.error('Error updating floor:', error);
            toast.error('Failed to update floor');
        }
    };


    // --- Area Management ---
    const handleSaveArea = async () => {
        if (!formData.name || !formData.capacity) {
            toast.error('Please fill in all required fields');
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                floor_id: selectedFloorId,
                name: formData.name,
                type: formData.type,
                capacity: parseInt(formData.capacity)
            };

            if (editingArea) {
                const { error } = await supabase
                    .from('areas')
                    .update(payload)
                    .eq('id', editingArea.id);
                if (error) throw error;
                toast.success('Area updated successfully');
            } else {
                const { error } = await supabase
                    .from('areas')
                    .insert(payload);
                if (error) throw error;
                toast.success('Area created successfully');
            }
            setIsAreaModalOpen(false);
            fetchAreas();
            setEditingArea(null);
            setFormData({ name: '', type: 'General Library', capacity: 50 });
        } catch (error) {
            console.error('Error saving area:', error);
            toast.error('Failed to save area');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteArea = async (id) => {
        if (!window.confirm('Are you sure? This will delete all history for this area.')) return;
        try {
            const { error } = await supabase.from('areas').delete().eq('id', id);
            if (error) throw error;
            toast.success('Area deleted');
            fetchAreas();
        } catch (error) {
            console.error('Error deleting area:', error);
            toast.error('Failed to delete area');
        }
    };

    const openEditModal = (area) => {
        setEditingArea(area);
        setFormData({
            name: area.name,
            type: area.type,
            capacity: area.capacity
        });
        setIsAreaModalOpen(true);
    };

    const openCreateModal = () => {
        setEditingArea(null);
        setFormData({ name: '', type: 'General Library', capacity: 50 });
        setIsAreaModalOpen(true);
    };

    if (!session) return null;

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar role="admin" />

            <div className="ml-64">
                <Topbar
                    title="Area Management"
                    subtitle={branch ? `${branch.name} - ${floors.find(f => f.id === selectedFloorId)?.label || 'No Floor Selected'}` : 'Select a Branch'}
                />

                <main className="p-8">
                    {!branch ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <Layout className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-500 font-medium">Please select a branch from the sidebar to manage areas.</p>
                        </div>
                    ) : (
                        <>
                            {/* Header & Controls */}
                            <div className="flex flex-col gap-6 mb-8">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-bold text-gray-900">Floors & Areas</h2>
                                    <button
                                        onClick={() => setIsFloorModalOpen(true)}
                                        className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Layers className="w-4 h-4" />
                                        Manage Floors
                                    </button>
                                </div>

                                {/* Floor Tabs */}
                                <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
                                    {floors.map(floor => (
                                        <button
                                            key={floor.id}
                                            onClick={() => setSelectedFloorId(floor.id)}
                                            className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all border-b-2 ${selectedFloorId === floor.id
                                                ? 'border-[#00104A] text-[#00104A] bg-blue-50/50'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            {floor.label || `Floor ${floor.floor_number}`}
                                        </button>
                                    ))}
                                    {floors.length === 0 && !isLoading && (
                                        <div className="text-sm text-gray-500 italic px-2">No floors found.</div>
                                    )}
                                </div>
                            </div>

                            {/* Add Area Button (Only if floor select) */}
                            {selectedFloorId && (
                                <div className="flex justify-end mb-6">
                                    <button
                                        onClick={openCreateModal}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#00104A] text-white rounded-lg hover:opacity-90 transition-colors shadow-sm"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Area
                                    </button>
                                </div>
                            )}

                            {/* Areas Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {areas.map(area => {
                                    const occupancy = attendanceCounts[area.id] || 0;
                                    const percentage = Math.round((occupancy / area.capacity) * 100);
                                    const isFull = percentage >= 100;

                                    return (
                                        <div key={area.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">{area.name}</h3>
                                                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md mt-1 font-medium">
                                                        {area.type}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEditModal(area)} className="p-1.5 text-gray-400 hover:text-[#56CBF9] hover:bg-blue-50 rounded-md transition-colors">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteArea(area.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-end justify-between mb-2">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Occupancy</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className={`text-2xl font-bold ${isFull ? 'text-red-500' : 'text-gray-900'}`}>
                                                            {occupancy}
                                                        </span>
                                                        <span className="text-gray-400 text-sm font-medium">/ {area.capacity}</span>
                                                    </div>
                                                </div>
                                                <div className={`p-2 rounded-lg ${isFull ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                                    <Users className="w-5 h-5" />
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' :
                                                        percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                                                        }`}
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}

                                {selectedFloorId && areas.length === 0 && !isLoading && (
                                    <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50 flex flex-col items-center justify-center">
                                        <MapPin className="w-10 h-10 mb-3 text-gray-300" />
                                        <p className="font-medium">No areas defined here yet.</p>
                                        <button onClick={openCreateModal} className="text-[#56CBF9] hover:text-blue-700 hover:underline mt-2 text-sm font-medium transition-colors">Create your first area</button>
                                    </div>
                                )}

                                {!selectedFloorId && !isLoading && floors.length > 0 && (
                                    <div className="col-span-full py-12 text-center text-gray-400">
                                        Please select a floor to view areas.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </main>
            </div>

            {/* Create/Edit Area Modal */}
            <Modal
                isOpen={isAreaModalOpen}
                onClose={() => setIsAreaModalOpen(false)}
                title={editingArea ? 'Edit Area' : 'Create New Area'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Area Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Children's Section"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#56CBF9] bg-white transition-shadow"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Area Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#56CBF9] bg-white transition-shadow"
                        >
                            <option value="General Library">General Library</option>
                            <option value="Children's Area">Children's Area</option>
                            <option value="Computer Area">Computer Area</option>
                            <option value="Reading Nook">Reading Nook</option>
                            <option value="Lobby">Lobby</option>
                            <option value="Conference Room">Conference Room</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                        <input
                            type="number"
                            min="1"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#56CBF9] bg-white transition-shadow"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={() => setIsAreaModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveArea}
                            disabled={isSaving}
                            className="px-4 py-2 bg-[#00104A] text-white rounded-lg hover:opacity-90 font-medium transition-all shadow-sm"
                        >
                            {isSaving ? 'Saving...' : (editingArea ? 'Update Area' : 'Create Area')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Floor Management Modal */}
            <Modal
                isOpen={isFloorModalOpen}
                onClose={() => setIsFloorModalOpen(false)}
                title={`Manage Floors (${branch?.name})`}
            >
                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3 border border-gray-100">
                        <p className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2">Add New Floor</p>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="No."
                                value={newFloorNum}
                                onChange={(e) => setNewFloorNum(e.target.value)}
                                className="w-20 px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                            <input
                                type="text"
                                placeholder="Label (e.g. Ground Floor)"
                                value={newFloorLabel}
                                onChange={(e) => setNewFloorLabel(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                            <button
                                onClick={handleAddFloor}
                                disabled={isActionLoading}
                                className="bg-[#00104A] text-white px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50 transition-colors"
                            >
                                {isActionLoading ? '...' : <Plus className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden border-gray-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3 border-b border-gray-100 w-16">No.</th>
                                    <th className="px-4 py-3 border-b border-gray-100">Label</th>
                                    <th className="px-4 py-3 border-b border-gray-100 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {isLoading ? (
                                    <tr><td colSpan="3" className="p-4 text-center">Loading...</td></tr>
                                ) : floors.length === 0 ? (
                                    <tr><td colSpan="3" className="p-4 text-center text-gray-400">No floors found.</td></tr>
                                ) : (
                                    floors.map(floor => (
                                        <tr key={floor.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-gray-900">{floor.floor_number}</td>

                                            {/* Label Cell: Check if editing */}
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {editingFloorId === floor.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={editFloorLabel}
                                                            onChange={(e) => setEditFloorLabel(e.target.value)}
                                                            className="px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                                                            autoFocus
                                                        />
                                                        <button onClick={() => saveFloorLabel(floor.id)} className="text-green-600 hover:bg-green-100 p-1 rounded"><Save className="w-4 h-4" /></button>
                                                        <button onClick={cancelEditingFloor} className="text-gray-500 hover:bg-gray-200 p-1 rounded"><X className="w-4 h-4" /></button>
                                                    </div>
                                                ) : (
                                                    floor.label
                                                )}
                                            </td>

                                            {/* Actions Cell */}
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    {/* Edit Button */}
                                                    {editingFloorId !== floor.id && (
                                                        <button
                                                            onClick={() => startEditingFloor(floor)}
                                                            className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-colors"
                                                            title="Edit Label"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleDeleteFloor(floor.id)}
                                                        className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"
                                                        title="Delete Floor"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button onClick={() => setIsFloorModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Close</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
