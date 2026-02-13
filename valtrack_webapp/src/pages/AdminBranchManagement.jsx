import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';
import {
    Map,
    Plus,
    Trash2,
    Edit2,
    Save,
    MapPin,
    AlertCircle,
    Building2,
    Power,
    CheckCircle2,
    XCircle,
    Layers
} from 'lucide-react';
import Modal from '../components/Modal';

export default function AdminBranchManagement() {
    const navigate = useNavigate();
    const { isAuthenticated, profile } = useAuth();
    const [branches, setBranches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [formData, setFormData] = useState({ name: '', is_active: true });

    useEffect(() => {
        if (!isAuthenticated || profile?.role !== 'admin') {
            navigate('/Home');
            return;
        }
        fetchBranches();
    }, [isAuthenticated, profile, navigate]);

    const fetchBranches = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('branches')
                .select('*')
                .order('name');
            if (error) throw error;
            setBranches(data || []);
        } catch (error) {
            console.error('Error fetching branches:', error);
            toast.error('Failed to load branches');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingBranch(null);
        setFormData({ name: '', is_active: true });
        setIsModalOpen(true);
    };

    const handleEdit = (branch) => {
        setEditingBranch(branch);
        setFormData({ name: branch.name, is_active: branch.is_active });
        setIsModalOpen(true);
    };

    const handleToggleActive = async (branch) => {
        const newStatus = !branch.is_active;
        const action = newStatus ? 'Activate' : 'Deactivate';

        if (!confirm(`Are you sure you want to ${action} ${branch.name}?`)) return;

        try {
            const { error } = await supabase
                .from('branches')
                .update({ is_active: newStatus })
                .eq('id', branch.id);

            if (error) throw error;

            await supabase.from('audit_logs').insert({
                user_name: profile.full_name || 'Admin',
                action: `${action} Branch`,
                module: 'Branch Management',
                details: `${action}d branch: ${branch.name} (ID: ${branch.id})`,
                branch_id: branch.id
            });

            toast.success(`Branch ${action}d successfully`);
            fetchBranches();
        } catch (error) {
            console.error(`Error ${action.toLowerCase()}ing branch:`, error);
            toast.error(`Failed to ${action.toLowerCase()} branch`);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this branch? This will cascade delete ALL floors, areas, and data within it!')) return;

        setIsActionLoading(true);
        try {
            const { error } = await supabase
                .from('branches')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await supabase.from('audit_logs').insert({
                user_name: profile.full_name || 'Admin',
                action: 'Delete Branch',
                module: 'Branch Management',
                details: `Deleted branch ID: ${id}`,
                branch_id: null
            });

            toast.success('Branch deleted');
            fetchBranches();
        } catch (error) {
            console.error('Error deleting branch:', error);
            toast.error('Failed to delete branch');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('Branch name is required');
            return;
        }

        setIsActionLoading(true);
        try {
            if (editingBranch) {
                // Update
                const { error } = await supabase
                    .from('branches')
                    .update({ name: formData.name })
                    .eq('id', editingBranch.id);

                if (error) throw error;
                toast.success('Branch updated');
            } else {
                // Create
                const { data: newBranch, error } = await supabase
                    .from('branches')
                    .insert({ name: formData.name, is_active: true })
                    .select()
                    .single();

                if (error) throw error;

                // 2. Add Default Floor (Floor 1)
                const { error: floorError } = await supabase.from('floors').insert({
                    branch_id: newBranch.id,
                    floor_number: 1,
                    label: 'Floor 1'
                });

                if (floorError) {
                    console.error('Error creating default floor:', floorError);
                    toast.warning('Branch created, but failed to create default floor.');
                } else {
                    toast.success('Branch created with default floor');
                }
            }
            setIsModalOpen(false);
            fetchBranches();
        } catch (error) {
            console.error('Error saving branch:', error);
            toast.error('Failed to save branch');
        } finally {
            setIsActionLoading(false);
        }
    };

    const goToAreaManagement = (branch) => {
        // Since branch context is global, we might not strictly need to set it here if the user selects it from the sidebar,
        // but it's good UX to perhaps auto-select it. 
        // However, the cleanest way is just to direct them to Area Management where they can manage floors for the currently selected branch.
        // If we want to force select this branch, we would need to access the branch context setter.
        // For now, let's assume the user selects the branch via the sidebar.
        // OR: We can just remove the button entirely since it's now in Area Management.
        // User request: "where do u add the manage floor, add it in area management"
        // This implies moving the FUNCTIONALITY.
        navigate('/AdminAreaManagement');
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
            <Sidebar role="admin" />
            <div className="ml-64">
                <Topbar title="Branch Management" subtitle="Manage library branches" />

                <main className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">All Branches</h2>
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-4 py-2 bg-[#00104A] text-white rounded-lg hover:opacity-90 transition-all font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Add Branch
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {branches.map(branch => (
                                <div key={branch.id} className={`rounded-xl border p-6 flex flex-col justify-between group transition-all duration-300 shadow-sm hover:shadow-md ${branch.is_active ? 'bg-white border-gray-100 hover:border-[#56CBF9]' : 'bg-gray-50 border-gray-200 opacity-75'}`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${branch.is_active ? 'bg-blue-50 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">

                                            <button
                                                onClick={() => handleToggleActive(branch)}
                                                className={`p-2 rounded-lg transition-colors ${branch.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-200'}`}
                                                title={branch.is_active ? "Deactivate Branch" : "Activate Branch"}
                                            >
                                                <Power className="w-4 h-4" />
                                            </button>

                                            <button onClick={() => handleEdit(branch)} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(branch.id)} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-bold text-lg mb-1 ${branch.is_active ? 'text-gray-900' : 'text-gray-500'}`}>{branch.name}</h3>
                                            {!branch.is_active && <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">Inactive</span>}
                                        </div>
                                        <p className="text-xs text-gray-400 font-mono truncate">{branch.id}</p>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <div className="text-xs text-gray-500">
                                            <span className={`flex items-center gap-1 font-medium ${branch.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                                                {branch.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                {branch.is_active ? 'Active' : 'Deactivated'}
                                            </span>
                                        </div>

                                        {/* Removed Manage Floors button from here as requested */}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Branch CRUD Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingBranch ? 'Edit Branch' : 'Add New Branch'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. ValACE Malinta"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#56CBF9]"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isActionLoading}
                            className="px-4 py-2 bg-[#00104A] text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
                        >
                            {isActionLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                            Save Branch
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
