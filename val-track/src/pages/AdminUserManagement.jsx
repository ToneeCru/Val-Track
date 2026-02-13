import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';
import {
    Plus,
    Edit2,
    Trash2,
    Search,
    UserCheck,
    Users,
    Shield,
    GraduationCap,
    ToggleLeft,
    ToggleRight,
    Bell,
    Check,
    X,
    User,
    Filter,
    MapPin,
    Layers,
    Layout
} from 'lucide-react';

export default function AdminUserManagement() {
    const navigate = useNavigate();
    const { branches } = useBranch();
    const { profile: session, isLoading: isAuthLoading } = useAuth();
    const [activeTab, setActiveTab] = useState('active_users');

    // Data State
    const [allUsers, setAllUsers] = useState([]);
    const [patrons, setPatrons] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter/Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all'); // all, staff, volunteer

    // Modal State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

    // Editing/Creation State
    const [editingUser, setEditingUser] = useState(null);
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);

    // Assignment Data (Cascading Dropdowns)
    const [floors, setFloors] = useState([]);
    const [areas, setAreas] = useState([]);

    // Form Data
    const [formData, setFormData] = useState({
        username: '',
        fullName: '',
        email: '',
        password: '',
        role: 'staff',
        title: 'Library Staff', // 'Library Staff' or 'Student Volunteer'
        assigned_branch_id: '',
        assigned_floor_id: '',
        assigned_area_id: '',
        avatarUrl: '',
        permissions: {}
    });

    const [announcementFormData, setAnnouncementFormData] = useState({
        title: '',
        message: '',
        module: 'General',
        target_audience: 'all',
        target_user_id: '',
        scheduled_at: new Date().toISOString().slice(0, 16)
    });

    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Module Definitions for Permissions
    const MODULES = [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'qr_scan', label: 'Patron QR Scan' },
        { key: 'baggage', label: 'Baggage Module' },
        { key: 'incidents', label: 'Incidents & Exceptions' },
        { key: 'user_management', label: 'User Management' }, // Admin only usually, but let's allow flexibility
        { key: 'branch_management', label: 'Branch Management' },
        { key: 'area_management', label: 'Area Management' },
        { key: 'reports', label: 'Reports & Analytics' },
        { key: 'audit_logs', label: 'Audit Logs' },
    ];

    const logAction = async (action, details, moduleName = 'User Management') => {
        if (!session) return;
        try {
            await supabase.from('audit_logs').insert({
                user_name: session.full_name || session.email || 'Admin',
                action: action,
                module: moduleName,
                details: details,
                branch_id: null, // System-level action, visible to all admins if filtered correctly
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to log action:', error);
        }
    };

    useEffect(() => {
        if (isAuthLoading) return;
        if (!session || session.role !== 'admin') {
            navigate('/Home');
            return;
        }

        // Fetch initially
        fetchUsers();
        fetchPatrons();
        fetchAnnouncements();

        // Real-time subscription for profiles to keep list in sync
        const channel = supabase
            .channel('admin_user_management')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                fetchUsers();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session, isAuthLoading, navigate]);

    // Fetch Cascading Data
    useEffect(() => {
        if (formData.assigned_branch_id) {
            fetchFloors(formData.assigned_branch_id);
        } else {
            setFloors([]);
            setAreas([]);
        }
    }, [formData.assigned_branch_id]);

    useEffect(() => {
        if (formData.assigned_floor_id) {
            fetchAreas(formData.assigned_floor_id);
        } else {
            setAreas([]);
        }
    }, [formData.assigned_floor_id]);

    const fetchFloors = async (branchId) => {
        const { data } = await supabase.from('floors').select('*').eq('branch_id', branchId).order('floor_number');
        setFloors(data || []);
    };

    const fetchAreas = async (floorId) => {
        const { data } = await supabase.from('areas').select('*').eq('floor_id', floorId).order('name');
        setAreas(data || []);
    };

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            // Join with branches, floors, areas to get names if needed, or just IDs
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    branches:assigned_branch_id(name),
                    floors:assigned_floor_id(label, floor_number),
                    areas:assigned_area_id(name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAllUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPatrons = async () => {
        try {
            const { data, error } = await supabase
                .from('patrons')
                .select('*')
                .eq('account_status', 'active');
            if (error) throw error;

            // Filter out patrons who are already staff/volunteers (by email)
            const { data: profiles } = await supabase.from('profiles').select('email');
            const profileEmails = new Set(profiles?.map(p => p.email) || []);

            setPatrons(data.filter(p => !profileEmails.has(p.email)) || []);
        } catch (error) {
            console.error('Error fetching patrons:', error);
        }
    };

    const fetchAnnouncements = async () => {
        const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
        setAnnouncements(data || []);
    };

    // Handlers
    const handlePromotePatron = (patron) => {
        setEditingUser(null); // Creating new profile from patron
        setFormData({
            username: patron.email ? patron.email.split('@')[0] : '',
            fullName: `${patron.firstname} ${patron.surname}`,
            email: patron.email || '',
            password: 'password123', // Default or prompt
            role: 'staff',
            title: 'Library Staff',
            assigned_branch_id: '',
            assigned_floor_id: '',
            assigned_area_id: '',
            avatarUrl: patron.profile_photo_path || '',
            permissions: { dashboard: true, qr_scan: true } // Defaults
        });
        setIsUserModalOpen(true);
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            fullName: user.full_name,
            email: user.email,
            password: '', // Don't show existing hash
            role: user.role,
            title: user.title || (user.role === 'staff' ? 'Library Staff' : 'Student Volunteer'),
            assigned_branch_id: user.assigned_branch_id || '',
            assigned_floor_id: user.assigned_floor_id || '',
            assigned_area_id: user.assigned_area_id || '',
            avatarUrl: user.avatar_url || '',
            permissions: user.permissions || {}
        });
        setIsUserModalOpen(true);
    };

    const handleDeleteUser = async (id) => {
        if (!confirm('Are you sure you want to remove this user from Staff/Volunteers?')) return;
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (error) throw error;
            await logAction('Delete User', `Deleted user with ID ${id}`);
            toast.success('User removed');
            fetchUsers();
            fetchPatrons(); // They might go back to patron list if logic permits, but mostly just deleted from profiles
        } catch (error) {
            toast.error('Failed to delete user');
        }
    };

    const handleSaveUser = async () => {
        try {
            if (!formData.title) {
                toast.error('Title is required');
                return;
            }

            // Map Title to Role for backend logic simplicity, BUT preserve 'admin' if already admin
            let role = formData.title === 'Library Staff' ? 'staff' : 'volunteer';
            if (editingUser && editingUser.role === 'admin') {
                role = 'admin';
            } else if (formData.role === 'admin') {
                // Just in case form data holds it
                role = 'admin';
            }

            const payload = {
                full_name: formData.fullName,
                username: formData.username,
                email: formData.email,
                role: role, // Use the safe role logic
                title: formData.title,
                avatar_url: formData.avatarUrl,
                assigned_branch_id: formData.assigned_branch_id || null,
                assigned_floor_id: formData.assigned_floor_id || null,
                assigned_area_id: formData.assigned_area_id || null,
                permissions: formData.permissions,
                ...(formData.password ? { password: formData.password } : {})
            };

            if (editingUser) {
                const { error } = await supabase.from('profiles').update(payload).eq('id', editingUser.id);
                if (error) throw error;
                await logAction('Update User', `Updated profile for ${payload.full_name} (${payload.email})`);
                toast.success('User updated');
            } else {
                // Creating new from Patron
                const { error } = await supabase.from('profiles').insert({
                    ...payload,
                    status: 'active'
                });
                if (error) throw error;
                await logAction('Create User', `Promoted/Created user ${payload.full_name} (${payload.email})`);
                toast.success('User added to team');
            }

            setIsUserModalOpen(false);
            fetchUsers();
            fetchPatrons();
        } catch (error) {
            console.error('Error saving user:', error);
            toast.error('Failed to save user');
        }
    };

    const handleTogglePermission = (moduleKey) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [moduleKey]: !prev.permissions[moduleKey]
            }
        }));
    };

    const handleFileChange = async (event) => {
        // ... (Same upload logic as before)
        try {
            setUploading(true);
            const file = event.target.files[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `admin-uploads/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            setFormData(prev => ({ ...prev, avatarUrl: data.publicUrl }));
            toast.success('Image uploaded');

        } catch (error) {
            console.error('Error uploading:', error);
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    // Announcement Handlers
    const handleSaveAnnouncement = async () => {
        try {
            if (!announcementFormData.title || !announcementFormData.message) {
                toast.error('Title and Message are required');
                return;
            }

            const payload = {
                title: announcementFormData.title,
                message: announcementFormData.message,
                module: announcementFormData.module,
                target_audience: announcementFormData.target_audience,
                target_user_id: announcementFormData.target_audience === 'specific' ? (announcementFormData.target_user_id || null) : null,
                scheduled_at: announcementFormData.scheduled_at,
            };

            if (editingAnnouncement) {
                const { error } = await supabase.from('announcements').update(payload).eq('id', editingAnnouncement.id);
                if (error) throw error;
                await logAction('Update Announcement', `Updated announcement: ${payload.title}`, 'Announcements');
                toast.success('Announcement updated');
            } else {
                payload.created_by = session.name || session.full_name || 'Administrator';
                const { error } = await supabase.from('announcements').insert(payload);
                if (error) throw error;
                await logAction('Create Announcement', `Posted announcement: ${payload.title}`, 'Announcements');
                toast.success('Announcement posted');
            }

            setIsAnnouncementModalOpen(false);
            fetchAnnouncements();
        } catch (error) {
            console.error('Error saving announcement:', error);
            toast.error('Failed to save announcement');
        }
    };

    const handleToggleAnnouncementStatus = async (item) => {
        try {
            const { error } = await supabase.from('announcements')
                .update({ is_active: !item.is_active })
                .eq('id', item.id);
            if (error) throw error;
            await logAction('Toggle Announcement', `${!item.is_active ? 'Activated' : 'Deactivated'} announcement: ${item.title}`, 'Announcements');
            fetchAnnouncements();
            toast.success(`Announcement ${!item.is_active ? 'activated' : 'deactivated'}`);
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleDeleteAnnouncement = async (id) => {
        if (!confirm('Are you sure you want to delete this announcement?')) return;
        try {
            const { error } = await supabase.from('announcements').delete().eq('id', id);
            if (error) throw error;
            await logAction('Delete Announcement', `Deleted announcement ID ${id}`, 'Announcements');
            toast.success('Announcement deleted');
            fetchAnnouncements();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    // Filter Logic
    const filteredUsers = allUsers.filter(user => {
        const matchesSearch = (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const filteredPatrons = patrons.filter(p =>
        (p.firstname?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.surname?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (!session) return null;

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar role="admin" />
            <div className="ml-64">
                <Topbar title="User Management" subtitle="Manage permissions and assignments" />
                <main className="p-8">

                    {/* Tabs */}
                    <div className="flex items-center gap-2 mb-6 bg-white p-2 rounded-xl border border-gray-100 w-fit">
                        {[
                            { id: 'active_users', label: 'Active Personnel', icon: Users },
                            { id: 'patron_list', label: 'Patron List (Grant Access)', icon: UserCheck },
                            { id: 'announcements', label: 'Announcements', icon: Bell }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === tab.id ? 'bg-[#00104A] text-white' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="text-sm font-medium">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    {activeTab === 'active_users' && (
                        <>
                            {/* Toolbar */}
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex gap-4">
                                    <div className="relative w-80">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search personnel..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#56CBF9]"
                                        />
                                    </div>
                                    <select
                                        value={roleFilter}
                                        onChange={e => setRoleFilter(e.target.value)}
                                        className="px-3 py-2 border rounded-lg focus:outline-none bg-white"
                                    >
                                        <option value="all">All Roles</option>
                                        <option value="staff">Library Staff</option>
                                        <option value="volunteer">Volunteers</option>
                                    </select>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4">User</th>
                                            <th className="px-6 py-4">Role/Title</th>
                                            <th className="px-6 py-4">Assignment</th>
                                            <th className="px-6 py-4 text-center">Modules</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredUsers.map(user => (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
                                                            {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">{user.full_name[0]}</div>}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{user.full_name}</p>
                                                            <p className="text-xs text-gray-500">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'staff' || user.role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                                                        }`}>
                                                        {user.title || user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-xs text-gray-600 space-y-0.5">
                                                        {user.branches?.name ? (
                                                            <div className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {user.branches.name}</div>
                                                        ) : <span className="text-gray-400">No Branch</span>}

                                                        {user.floors?.label ? (
                                                            <div className="flex items-center gap-1 pl-4"><Layers className="w-3 h-3" /> {user.floors.label}</div>
                                                        ) : null}

                                                        {user.areas?.name ? (
                                                            <div className="flex items-center gap-1 pl-8"><MapPin className="w-3 h-3" /> {user.areas.name}</div>
                                                        ) : null}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span
                                                        className="text-xs font-mono bg-gray-100 px-2 py-1 rounded cursor-help"
                                                        title={Object.keys(user.permissions || {}).filter(k => user.permissions[k]).join(', ')}
                                                    >
                                                        {Object.keys(user.permissions || {}).filter(k => user.permissions[k]).length} {Object.keys(user.permissions || {}).filter(k => user.permissions[k]).length === 1 ? 'Module' : 'Modules'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {user.role !== 'admin' && (
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => handleEditUser(user)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {activeTab === 'patron_list' && (
                        <>
                            {/* Toolbar */}
                            <div className="flex justify-between items-center mb-6">
                                <div className="relative w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search patrons..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#56CBF9]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredPatrons.map(patron => (
                                    <div key={patron.id} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-all">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden">
                                                {patron.profile_photo_path ? <img src={patron.profile_photo_path} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-500">{patron.firstname[0]}</div>}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{patron.firstname} {patron.surname}</h3>
                                                <p className="text-sm text-gray-500">{patron.email}</p>
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded mt-1 inline-block">{patron.library_card_number}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handlePromotePatron(patron)}
                                            className="w-full py-2 bg-[#00104A] text-white rounded-lg font-medium hover:opacity-90 flex items-center justify-center gap-2"
                                        >
                                            <Shield className="w-4 h-4" />
                                            Grant Permission
                                        </button>
                                    </div>
                                ))}
                                {filteredPatrons.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-gray-500">No patrons found matching your search.</div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'announcements' && (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <div className="relative w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search announcements..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#56CBF9]"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingAnnouncement(null);
                                        setAnnouncementFormData({
                                            title: '',
                                            message: '',
                                            module: 'General',
                                            target_audience: 'all',
                                            target_user_id: '',
                                            scheduled_at: new Date().toISOString().slice(0, 16)
                                        });
                                        setIsAnnouncementModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#00104A] text-white rounded-lg hover:opacity-90 transition-all font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    New Announcement
                                </button>
                            </div>

                            <div className="space-y-4">
                                {announcements.filter(a =>
                                    (a.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                                    (a.message?.toLowerCase() || '').includes(searchTerm.toLowerCase())
                                ).map(announcement => (
                                    <div key={announcement.id} className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-4 justify-between hover:shadow-sm transition-all">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${announcement.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {announcement.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                                                    {announcement.module || 'General'}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(announcement.scheduled_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-gray-900 mb-1">{announcement.title}</h3>
                                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{announcement.message}</p>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    Target: {announcement.target_audience === 'all' ? 'Everyone' :
                                                        announcement.target_audience === 'staff' ? 'Staff Only' :
                                                            announcement.target_audience === 'volunteer' ? 'Volunteers Only' : 'Specific User'}
                                                </span>
                                                <span>By: {announcement.created_by}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 border-l border-gray-100 pl-4">
                                            <button
                                                onClick={() => handleToggleAnnouncementStatus(announcement)}
                                                className={`p-2 rounded hover:bg-gray-50 ${announcement.is_active ? 'text-green-600' : 'text-gray-400'}`}
                                                title={announcement.is_active ? "Deactivate" : "Activate"}
                                            >
                                                {announcement.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingAnnouncement(announcement);
                                                    setAnnouncementFormData({
                                                        title: announcement.title,
                                                        message: announcement.message,
                                                        module: announcement.module || 'General',
                                                        target_audience: announcement.target_audience,
                                                        target_user_id: announcement.target_user_id || '',
                                                        scheduled_at: new Date(announcement.scheduled_at).toISOString().slice(0, 16)
                                                    });
                                                    setIsAnnouncementModalOpen(true);
                                                }}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAnnouncement(announcement.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {announcements.length === 0 && (
                                    <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200 border-dashed">
                                        <Bell className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                                        <p>No announcements found.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </main>
            </div>


            {/* Grant Permission / Edit User Modal */}
            < Modal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                title={editingUser ? `Manage ${editingUser.full_name}` : 'Grant Access to Patron'}
            >
                {/* ... existing User Modal content ... */}
                < div className="space-y-6 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar" >
                    {/* User Info Read-only(ish) */}
                    < div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg" >
                        <div className="w-14 h-14 rounded-full bg-white border-2 border-white shadow overflow-hidden">
                            {formData.avatarUrl ? <img src={formData.avatarUrl} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center w-full h-full"><User className="w-6 h-6 text-gray-400" /></div>}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">{formData.fullName}</p>
                            <p className="text-sm text-gray-500">{formData.email}</p>
                        </div>
                    </div >

                    {/* Role / Title */}
                    < div >
                        <label className="block text-sm font-medium text-gray-700 mb-2">Title / Role</label>
                        <select
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#56CBF9] outline-none"
                            disabled={formData.role === 'admin'} // Disable for admins
                        >
                            {formData.role === 'admin' ? (
                                <option value="System Administrator">System Administrator</option>
                            ) : (
                                <>
                                    <option value="Library Staff">Library Staff</option>
                                    <option value="Student Volunteer">Student Volunteer</option>
                                </>
                            )}
                        </select>
                    </div >

                    {/* Assignments (Hide for Admin) */}
                    {
                        formData.role !== 'admin' && (
                            <div className="space-y-4 border-t border-gray-100 pt-4">
                                <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-500" /> Assignment Scope
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
                                        <select
                                            value={formData.assigned_branch_id}
                                            onChange={e => setFormData({ ...formData, assigned_branch_id: e.target.value, assigned_floor_id: '', assigned_area_id: '' })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                        >
                                            <option value="">-- No Branch Assigned --</option>
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Floor (Optional)</label>
                                        <select
                                            value={formData.assigned_floor_id}
                                            onChange={e => setFormData({ ...formData, assigned_floor_id: e.target.value, assigned_area_id: '' })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                            disabled={!formData.assigned_branch_id}
                                        >
                                            <option value="">-- All Floors --</option>
                                            {floors.map(f => <option key={f.id} value={f.id}>{f.label || `Floor ${f.floor_number}`}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-full">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Area (Optional)</label>
                                        <select
                                            value={formData.assigned_area_id}
                                            onChange={e => setFormData({ ...formData, assigned_area_id: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                            disabled={!formData.assigned_floor_id}
                                        >
                                            <option value="">-- All Areas --</option>
                                            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            Assigning a specific area limits the user's view to only that area's data in the Dashboard and other modules.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* Permissions (Hide for Admin as they have full access) */}
                    {
                        formData.role !== 'admin' && (
                            <div className="space-y-4 border-t border-gray-100 pt-4">
                                <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-blue-500" /> Module Permissions
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {MODULES.map(module => (
                                        <div
                                            key={module.key}
                                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${formData.permissions[module.key] ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                                                }`}
                                            onClick={() => handleTogglePermission(module.key)}
                                        >
                                            <span className={`text-sm font-medium ${formData.permissions[module.key] ? 'text-blue-900' : 'text-gray-600'}`}>
                                                {module.label}
                                            </span>
                                            {formData.permissions[module.key] ? (
                                                <ToggleRight className="w-5 h-5 text-blue-500" />
                                            ) : (
                                                <ToggleLeft className="w-5 h-5 text-gray-300" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    }

                    {/* Password Section (Only if needed) */}
                    {
                        !editingUser && (
                            <div className="border-t border-gray-100 pt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Set Password</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    placeholder="Min. 6 characters"
                                />
                            </div>
                        )
                    }

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                        <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button onClick={handleSaveUser} className="px-6 py-2 bg-[#00104A] text-white rounded-lg hover:opacity-90 font-medium">
                            Save Access
                        </button>
                    </div>
                </div >
            </Modal >

            {/* Announcement Modal */}
            < Modal
                isOpen={isAnnouncementModalOpen}
                onClose={() => setIsAnnouncementModalOpen(false)}
                title={editingAnnouncement ? "Edit Announcement" : "Create Announcement"}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={announcementFormData.title}
                            onChange={e => setAnnouncementFormData({ ...announcementFormData, title: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#56CBF9] outline-none"
                            placeholder="Announcement Title"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea
                            value={announcementFormData.message}
                            onChange={e => setAnnouncementFormData({ ...announcementFormData, message: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#56CBF9] outline-none h-24 resize-none"
                            placeholder="Enter your message here..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Module / Topic</label>
                            <select
                                value={announcementFormData.module}
                                onChange={e => setAnnouncementFormData({ ...announcementFormData, module: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg bg-white"
                            >
                                <option value="General">General</option>
                                <option value="System">System Update</option>
                                <option value="Event">Event/Activity</option>
                                <option value="Policy">Policy Change</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule At</label>
                            <input
                                type="datetime-local"
                                value={announcementFormData.scheduled_at}
                                onChange={e => setAnnouncementFormData({ ...announcementFormData, scheduled_at: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                        <select
                            value={announcementFormData.target_audience}
                            onChange={e => setAnnouncementFormData({ ...announcementFormData, target_audience: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg bg-white mb-3"
                        >
                            <option value="all">Everyone</option>
                            <option value="staff">Library Staff Only</option>
                            <option value="volunteer">Volunteers Only</option>
                            <option value="specific">Specific User</option>
                        </select>

                        {announcementFormData.target_audience === 'specific' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Select User</label>
                                <select
                                    value={announcementFormData.target_user_id}
                                    onChange={e => setAnnouncementFormData({ ...announcementFormData, target_user_id: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
                                >
                                    <option value="">-- Choose User --</option>
                                    {allUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
                        <button onClick={() => setIsAnnouncementModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button onClick={handleSaveAnnouncement} className="px-6 py-2 bg-[#00104A] text-white rounded-lg hover:opacity-90 font-medium">
                            {editingAnnouncement ? 'Update Announcement' : 'Post Announcement'}
                        </button>
                    </div>
                </div>
            </Modal >

            {/* Building2 import fix check */}
        </div >
    );
}

// Helper icon
