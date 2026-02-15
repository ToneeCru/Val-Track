import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
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
    Layout,
    Download,
    FileDown,
    Eye,
    Building2,
    KeyRound,
    CheckCircle2,
    AlertTriangle,
    AlertCircle
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
    const [roleFilter, setRoleFilter] = useState('all');
    const [patronStatusFilter, setPatronStatusFilter] = useState('all');
    const [patronGenderFilter, setPatronGenderFilter] = useState('all');
    const [patronSortDate, setPatronSortDate] = useState('newest');

    // Grant Access Modal State
    const [isGrantAccessModalOpen, setIsGrantAccessModalOpen] = useState(false);
    const [grantingPatron, setGrantingPatron] = useState(null);
    const [grantAccessData, setGrantAccessData] = useState({
        title: 'Patron',
        assigned_branch_id: '',
        assigned_floor_id: '',
        assigned_area_id: '',
        permissions: { dashboard: true }
    });
    const [grantFloors, setGrantFloors] = useState([]);
    const [grantAreas, setGrantAreas] = useState([]);

    const ACCOUNT_STATUSES = ['active', 'suspended', 'blocked'];

    // Modal State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

    // Editing/Creation State
    const [editingUser, setEditingUser] = useState(null);
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);

    // Patron CRUD State
    const [isPatronModalOpen, setIsPatronModalOpen] = useState(false);
    const [isViewPatronModalOpen, setIsViewPatronModalOpen] = useState(false);
    const [editingPatron, setEditingPatron] = useState(null);
    const [viewingPatron, setViewingPatron] = useState(null);
    const [patronFormData, setPatronFormData] = useState({
        surname: '', firstname: '', middlename: '', dateofbirth: '',
        address: '', city: '', email: '', gender: '', library_id: '',
        account_status: 'active'
    });

    // Confirmation & Success Modal State
    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });
    const [successModal, setSuccessModal] = useState({ open: false, title: '', message: '', details: '' });
    const [alreadyGrantedModal, setAlreadyGrantedModal] = useState({ open: false, patronName: '' });

    // Fetch floors/areas for grant access modal
    useEffect(() => {
        if (grantAccessData.assigned_branch_id) {
            (async () => {
                const { data } = await supabase.from('floors').select('*').eq('branch_id', grantAccessData.assigned_branch_id).order('floor_number');
                setGrantFloors(data || []);
                setGrantAreas([]);
                setGrantAccessData(prev => ({ ...prev, assigned_floor_id: '', assigned_area_id: '' }));
            })();
        } else {
            setGrantFloors([]);
            setGrantAreas([]);
        }
    }, [grantAccessData.assigned_branch_id]);

    useEffect(() => {
        if (grantAccessData.assigned_floor_id) {
            (async () => {
                const { data } = await supabase.from('areas').select('*').eq('floor_id', grantAccessData.assigned_floor_id).order('name');
                setGrantAreas(data || []);
                setGrantAccessData(prev => ({ ...prev, assigned_area_id: '' }));
            })();
        } else {
            setGrantAreas([]);
        }
    }, [grantAccessData.assigned_floor_id]);

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
        { key: 'user_management', label: 'User Management' },
        { key: 'branch_management', label: 'Branch Management' },
        { key: 'area_management', label: 'Area Management' },
        { key: 'reports', label: 'Reports & Analytics' },
        { key: 'audit_logs', label: 'Audit Logs' },
    ];

    // Role-based module presets (matches Sidebar menu items)
    const STAFF_MODULES = ['dashboard', 'qr_scan', 'baggage', 'incidents'];
    const VOLUNTEER_MODULES = ['dashboard', 'qr_scan', 'baggage'];

    const ROLE_TITLES = [
        { value: 'staff', label: 'Library Staff', modules: STAFF_MODULES },
        { value: 'volunteer', label: 'Student Volunteer', modules: VOLUNTEER_MODULES },
    ];

    // Get modules available for a given role
    const getModulesForRole = (role) => {
        const roleDef = ROLE_TITLES.find(r => r.value === role);
        if (!roleDef) return MODULES; // fallback to all
        return MODULES.filter(m => roleDef.modules.includes(m.key));
    };

    // Get default permissions for a role
    const getDefaultPermissions = (role) => {
        const roleDef = ROLE_TITLES.find(r => r.value === role);
        if (!roleDef) return { dashboard: true };
        const perms = {};
        roleDef.modules.forEach(k => perms[k] = true);
        return perms;
    };

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
                .order('created_at', { ascending: false });
            if (error) throw error;
            setPatrons(data || []);
        } catch (error) {
            console.error('Error fetching patrons:', error);
        }
    };

    const fetchAnnouncements = async () => {
        const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
        setAnnouncements(data || []);
    };

    // Patron CRUD Handlers
    const openAddPatron = () => {
        setEditingPatron(null);
        setPatronFormData({
            surname: '', firstname: '', middlename: '', dateofbirth: '',
            address: '', city: '', email: '', gender: '', library_id: '',
            account_status: 'active'
        });
        setIsPatronModalOpen(true);
    };

    const openEditPatron = (patron) => {
        setEditingPatron(patron);
        setPatronFormData({
            surname: patron.surname || '', firstname: patron.firstname || '',
            middlename: patron.middlename || '', dateofbirth: patron.dateofbirth || '',
            address: patron.address || '', city: patron.city || '',
            email: patron.email || '', gender: patron.gender || '',
            library_id: patron.library_id || '', account_status: patron.account_status || 'active'
        });
        setIsPatronModalOpen(true);
    };

    const handleSavePatron = async () => {
        try {
            if (!patronFormData.surname || !patronFormData.firstname || !patronFormData.dateofbirth || !patronFormData.email) {
                toast.error('Surname, First Name, Date of Birth, and Email are required');
                return;
            }
            const payload = { ...patronFormData };
            if (editingPatron) {
                const { error } = await supabase.from('patrons').update(payload).eq('id', editingPatron.id);
                if (error) throw error;
                await logAction('Update Patron', `Updated patron: ${payload.firstname} ${payload.surname}`);
                toast.success('Patron updated');
            } else {
                const { error } = await supabase.from('patrons').insert(payload);
                if (error) throw error;
                await logAction('Create Patron', `Created patron: ${payload.firstname} ${payload.surname}`);
                toast.success('Patron created');
            }
            setIsPatronModalOpen(false);
            fetchPatrons();
        } catch (error) {
            console.error('Error saving patron:', error);
            toast.error('Failed to save patron: ' + (error.message || ''));
        }
    };

    const handleDeletePatron = async (id) => {
        setConfirmModal({
            open: true,
            title: 'Delete Patron',
            message: 'Are you sure you want to delete this patron? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    const { error } = await supabase.from('patrons').delete().eq('id', id);
                    if (error) throw error;
                    await logAction('Delete Patron', `Deleted patron ID ${id}`);
                    toast.success('Patron deleted');
                    fetchPatrons();
                } catch (error) {
                    toast.error('Failed to delete patron');
                }
                setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
            }
        });
    };

    const handlePatronStatusChange = async (patronId, newStatus) => {
        try {
            const { error } = await supabase.from('patrons').update({ account_status: newStatus }).eq('id', patronId);
            if (error) throw error;
            await logAction('Update Patron Status', `Changed patron ${patronId} status to ${newStatus}`);
            toast.success(`Patron status changed to ${newStatus}`);
            fetchPatrons();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const openGrantAccessModal = (patron) => {
        if (!patron.library_id) {
            toast.error('Patron must have a Library ID to grant access');
            return;
        }
        if (!patron.dateofbirth) {
            toast.error('Patron must have a date of birth to grant access');
            return;
        }
        setGrantingPatron(patron);
        const defaultRole = 'staff';
        setGrantAccessData({
            role: defaultRole,
            title: 'Library Staff',
            assigned_branch_id: '',
            assigned_floor_id: '',
            assigned_area_id: '',
            permissions: getDefaultPermissions(defaultRole)
        });
        setGrantFloors([]);
        setGrantAreas([]);
        setIsGrantAccessModalOpen(true);
    };

    const handleGrantRoleChange = (selectedRole) => {
        const roleDef = ROLE_TITLES.find(r => r.value === selectedRole);
        setGrantAccessData(prev => ({
            ...prev,
            role: selectedRole,
            title: roleDef?.label || selectedRole,
            permissions: getDefaultPermissions(selectedRole)
        }));
    };

    const handleGrantAccessSubmit = async () => {
        if (!grantingPatron) return;
        try {
            const dob = grantingPatron.dateofbirth;
            const { data: existing } = await supabase.from('profiles').select('id').eq('email', grantingPatron.library_id).single();
            if (existing) {
                setIsGrantAccessModalOpen(false);
                setAlreadyGrantedModal({ open: true, patronName: `${grantingPatron.firstname} ${grantingPatron.surname}` });
                return;
            }
            if (!grantAccessData.assigned_branch_id) {
                toast.error('Branch assignment is required');
                return;
            }
            if (!grantAccessData.assigned_floor_id) {
                toast.error('Floor assignment is required');
                return;
            }
            if (!grantAccessData.assigned_area_id) {
                toast.error('Area assignment is required');
                return;
            }

            const { error } = await supabase.from('profiles').insert({
                full_name: `${grantingPatron.firstname} ${grantingPatron.middlename ? grantingPatron.middlename + ' ' : ''}${grantingPatron.surname}`,
                username: grantingPatron.library_id,
                email: grantingPatron.library_id,
                password: dob,
                role: grantAccessData.role || 'staff',
                title: grantAccessData.title || 'Library Staff',
                status: 'active',
                permissions: grantAccessData.permissions,
                avatar_url: grantingPatron.profile_photo_path || '',
                assigned_branch_id: grantAccessData.assigned_branch_id || null,
                assigned_floor_id: grantAccessData.assigned_floor_id || null,
                assigned_area_id: grantAccessData.assigned_area_id || null
            });
            if (error) throw error;
            await logAction('Grant Access', `Granted login access to patron ${grantingPatron.firstname} ${grantingPatron.surname} (${grantingPatron.library_id})`);
            setIsGrantAccessModalOpen(false);
            setSuccessModal({
                open: true,
                title: 'Access Granted!',
                message: `${grantingPatron.firstname} ${grantingPatron.surname} has been granted login access.`,
                details: `Login: ${grantingPatron.library_id}  |  Password: ${dob}`
            });
            fetchUsers();
        } catch (error) {
            console.error('Error granting access:', error);
            toast.error('Failed to grant access: ' + (error.message || ''));
        }
    };

    const handleToggleGrantPermission = (moduleKey) => {
        setGrantAccessData(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [moduleKey]: !prev.permissions[moduleKey] }
        }));
    };

    // Export Functions
    const downloadPatronPDF = (patron) => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Patron Information', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        const fields = [
            ['Library ID', patron.library_id || 'N/A'],
            ['Surname', patron.surname], ['First Name', patron.firstname],
            ['Middle Name', patron.middlename || 'N/A'],
            ['Gender', patron.gender || 'N/A'],
            ['Date of Birth', patron.dateofbirth || 'N/A'],
            ['Email', patron.email], ['Address', patron.address],
            ['City', patron.city],
            ['Account Status', patron.account_status || 'active'],
            ['Created At', patron.created_at ? new Date(patron.created_at).toLocaleDateString() : 'N/A'],
        ];
        let y = 36;
        fields.forEach(([label, value]) => {
            doc.setTextColor(60);
            doc.setFont(undefined, 'bold');
            doc.text(`${label}:`, 14, y);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(30);
            doc.text(String(value), 70, y);
            y += 8;
        });
        doc.save(`patron_${patron.library_id || patron.id}.pdf`);
    };

    const downloadAllCSV = () => {
        const headers = ['Library ID', 'Surname', 'First Name', 'Middle Name', 'Gender', 'Date of Birth', 'Email', 'Address', 'City', 'Status', 'Created At'];
        const rows = filteredPatrons.map(p => [
            p.library_id || '', p.surname, p.firstname, p.middlename || '',
            p.gender || '', p.dateofbirth || '', p.email, p.address, p.city,
            p.account_status || 'active', p.created_at ? new Date(p.created_at).toLocaleDateString() : ''
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'patrons_export.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const downloadAllPDF = () => {
        const doc = new jsPDF('landscape');
        doc.setFontSize(16);
        doc.text('All Patrons Report', 14, 18);
        doc.setFontSize(8);
        const cols = ['#', 'Library ID', 'Surname', 'First Name', 'Gender', 'DOB', 'Email', 'City', 'Status'];
        const colX = [14, 22, 52, 92, 132, 152, 180, 220, 260];
        let y = 30;
        doc.setFont(undefined, 'bold');
        cols.forEach((c, i) => doc.text(c, colX[i], y));
        doc.setFont(undefined, 'normal');
        y += 6;
        filteredPatrons.forEach((p, idx) => {
            if (y > 190) { doc.addPage(); y = 20; }
            const row = [String(idx + 1), p.library_id || '', p.surname, p.firstname, p.gender || '', p.dateofbirth || '', p.email, p.city, p.account_status || 'active'];
            row.forEach((val, i) => doc.text(String(val).substring(0, 25), colX[i], y));
            y += 6;
        });
        doc.save('patrons_report.pdf');
    };

    // Handlers

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
        setConfirmModal({
            open: true,
            title: 'Remove Personnel',
            message: 'Are you sure you want to remove this user from Staff/Volunteers? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    const { error } = await supabase.from('profiles').delete().eq('id', id);
                    if (error) throw error;
                    await logAction('Delete User', `Deleted user with ID ${id}`);
                    toast.success('User removed');
                    fetchUsers();
                    fetchPatrons();
                } catch (error) {
                    toast.error('Failed to delete user');
                }
                setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
            }
        });
    };

    const handleToggleUserStatus = async (user) => {
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        try {
            const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', user.id);
            if (error) throw error;
            await logAction('Toggle Status', `Set ${user.full_name} status to ${newStatus}`);
            toast.success(`${user.full_name} is now ${newStatus}`);
            fetchUsers();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleSaveUser = async () => {
        try {
            if (!formData.title) {
                toast.error('Title is required');
                return;
            }

            // Map Title to Role for backend logic
            let role = 'staff'; // default fallback
            if (formData.title === 'Library Staff') role = 'staff';
            else if (formData.title === 'Student Volunteer') role = 'volunteer';

            if (editingUser && editingUser.role === 'admin') {
                role = 'admin';
            } else if (formData.role === 'admin') {
                role = 'admin';
            }

            // Validation for Staff/Volunteer Assignments
            if (role === 'staff' || role === 'volunteer') {
                if (!formData.assigned_branch_id) {
                    toast.error('Branch assignment is required');
                    return;
                }
                if (!formData.assigned_floor_id) {
                    toast.error('Floor assignment is required');
                    return;
                }
                if (!formData.assigned_area_id) {
                    toast.error('Area assignment is required');
                    return;
                }
            }

            const payload = {
                full_name: formData.fullName,
                username: formData.username,
                email: formData.email,
                role: role,
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

    const filteredPatrons = patrons.filter(p => {
        const matchesSearch = (p.firstname?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (p.surname?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (p.library_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (p.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesStatus = patronStatusFilter === 'all' || (p.account_status || 'active') === patronStatusFilter;
        const matchesGender = patronGenderFilter === 'all' || (p.gender || '') === patronGenderFilter;
        return matchesSearch && matchesStatus && matchesGender;
    }).sort((a, b) => {
        switch (patronSortDate) {
            case 'a-z': return (`${a.surname} ${a.firstname}`).localeCompare(`${b.surname} ${b.firstname}`);
            case 'z-a': return (`${b.surname} ${b.firstname}`).localeCompare(`${a.surname} ${a.firstname}`);
            case 'bday-asc': return (a.dateofbirth || '').localeCompare(b.dateofbirth || '');
            case 'bday-desc': return (b.dateofbirth || '').localeCompare(a.dateofbirth || '');
            case 'oldest': return new Date(a.created_at || 0) - new Date(b.created_at || 0);
            case 'newest':
            default: return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
    });

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
                                                        <div className="flex justify-end items-center gap-2">
                                                            <button
                                                                onClick={() => handleToggleUserStatus(user)}
                                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${user.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`}
                                                                title={user.status === 'active' ? 'Active — Click to deactivate' : 'Inactive — Click to activate'}
                                                            >
                                                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${user.status === 'active' ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                                                            </button>
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
                            <div className="flex flex-col gap-4 mb-6">
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-3 items-center flex-wrap">
                                        <div className="relative w-72">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search by name, ID, email..."
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#56CBF9] text-sm"
                                            />
                                        </div>
                                        <select
                                            value={patronStatusFilter}
                                            onChange={e => setPatronStatusFilter(e.target.value)}
                                            className="px-3 py-2 border rounded-lg focus:outline-none bg-white text-sm"
                                        >
                                            <option value="all">All Status</option>
                                            {ACCOUNT_STATUSES.map(s => (
                                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={patronGenderFilter}
                                            onChange={e => setPatronGenderFilter(e.target.value)}
                                            className="px-3 py-2 border rounded-lg focus:outline-none bg-white text-sm"
                                        >
                                            <option value="all">All Gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="prefer_not_to_say">Prefer not to say</option>
                                        </select>
                                        <select
                                            value={patronSortDate}
                                            onChange={e => setPatronSortDate(e.target.value)}
                                            className="px-3 py-2 border rounded-lg focus:outline-none bg-white text-sm"
                                        >
                                            <option value="newest">Newest First</option>
                                            <option value="oldest">Oldest First</option>
                                            <option value="a-z">Name A → Z</option>
                                            <option value="z-a">Name Z → A</option>
                                            <option value="bday-asc">Birthday ↑ (Oldest)</option>
                                            <option value="bday-desc">Birthday ↓ (Youngest)</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={downloadAllCSV} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600" title="Export CSV">
                                            <FileDown className="w-4 h-4" /> CSV
                                        </button>
                                        <button onClick={downloadAllPDF} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600" title="Export PDF">
                                            <Download className="w-4 h-4" /> PDF
                                        </button>

                                    </div>
                                </div>
                                <p className="text-xs text-gray-400">{filteredPatrons.length} patron{filteredPatrons.length !== 1 ? 's' : ''} found</p>
                            </div>

                            {/* Patron Table */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3">Library ID</th>
                                            <th className="px-4 py-3">Name</th>
                                            <th className="px-4 py-3">Gender</th>
                                            <th className="px-4 py-3">Date of Birth</th>
                                            <th className="px-4 py-3">Email</th>
                                            <th className="px-4 py-3">City</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredPatrons.map(patron => (
                                            <tr key={patron.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{patron.library_id || '—'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                                                            {patron.profile_photo_path ? <img src={patron.profile_photo_path} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-xs">{patron.firstname?.[0]}{patron.surname?.[0]}</div>}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{patron.surname}, {patron.firstname} {patron.middlename || ''}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 capitalize">{patron.gender || '—'}</td>
                                                <td className="px-4 py-3 text-gray-600">{patron.dateofbirth || '—'}</td>
                                                <td className="px-4 py-3 text-gray-600">{patron.email}</td>
                                                <td className="px-4 py-3 text-gray-600">{patron.city}</td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        value={patron.account_status || 'active'}
                                                        onChange={e => handlePatronStatusChange(patron.id, e.target.value)}
                                                        className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer outline-none ${(patron.account_status || 'active') === 'active' ? 'bg-green-50 text-green-700' :
                                                            (patron.account_status) === 'suspended' ? 'bg-yellow-50 text-yellow-700' :
                                                                (patron.account_status) === 'blocked' ? 'bg-red-50 text-red-600' :
                                                                    'bg-gray-50 text-gray-600'
                                                            }`}
                                                    >
                                                        {ACCOUNT_STATUSES.map(s => (
                                                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button onClick={() => openEditPatron(patron)} className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded" title="Edit"><Edit2 className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDeletePatron(patron.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                                        <button onClick={() => openGrantAccessModal(patron)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="Grant Login Access"><KeyRound className="w-4 h-4" /></button>
                                                        <button onClick={() => downloadPatronPDF(patron)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded" title="Download PDF"><Download className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredPatrons.length === 0 && (
                                    <div className="py-12 text-center text-gray-400">
                                        <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                                        <p>No patrons found.</p>
                                    </div>
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
                            onChange={e => {
                                const newTitle = e.target.value;
                                const newRole = newTitle === 'Library Staff' ? 'staff' : 'volunteer';
                                setFormData(prev => ({
                                    ...prev,
                                    title: newTitle,
                                    role: newRole,
                                    permissions: getDefaultPermissions(newRole)
                                }));
                            }}
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
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Branch *</label>
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
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Floor *</label>
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
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Area *</label>
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
                                    {getModulesForRole(formData.role || 'staff').map(module => (
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
                                <p className="text-xs text-gray-400 mt-2">Modules shown are based on the selected role. Change the Title/Role above to see different modules.</p>
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

            {/* Patron Add/Edit Modal */}
            <Modal isOpen={isPatronModalOpen} onClose={() => setIsPatronModalOpen(false)} title={editingPatron ? 'Edit Patron' : 'Add Patron'} size="lg">
                <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Surname *</label>
                            <input type="text" value={patronFormData.surname} onChange={e => setPatronFormData({ ...patronFormData, surname: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Surname" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                            <input type="text" value={patronFormData.firstname} onChange={e => setPatronFormData({ ...patronFormData, firstname: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="First Name" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                            <input type="text" value={patronFormData.middlename} onChange={e => setPatronFormData({ ...patronFormData, middlename: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Middle Name" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Library ID</label>
                            <input type="text" value={patronFormData.library_id} onChange={e => setPatronFormData({ ...patronFormData, library_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g. LIB-2026-0001" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                            <select value={patronFormData.gender} onChange={e => setPatronFormData({ ...patronFormData, gender: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white">
                                <option value="">-- Select --</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="prefer_not_to_say">Prefer not to say</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                            <input type="date" value={patronFormData.dateofbirth} onChange={e => setPatronFormData({ ...patronFormData, dateofbirth: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <input type="email" value={patronFormData.email} onChange={e => setPatronFormData({ ...patronFormData, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Email" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <input type="text" value={patronFormData.address} onChange={e => setPatronFormData({ ...patronFormData, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Address" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <input type="text" value={patronFormData.city} onChange={e => setPatronFormData({ ...patronFormData, city: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="City" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button onClick={() => setIsPatronModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button onClick={handleSavePatron} className="px-6 py-2 bg-[#00104A] text-white rounded-lg hover:opacity-90 font-medium">{editingPatron ? 'Update Patron' : 'Add Patron'}</button>
                    </div>
                </div>
            </Modal>

            {/* View Patron Modal */}
            <Modal isOpen={isViewPatronModalOpen} onClose={() => setIsViewPatronModalOpen(false)} title="Patron Details" size="md">
                {viewingPatron && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                            <div className="w-16 h-16 rounded-full bg-white border-2 border-white shadow overflow-hidden">
                                {viewingPatron.profile_photo_path ? <img src={viewingPatron.profile_photo_path} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center w-full h-full"><User className="w-8 h-8 text-gray-400" /></div>}
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 text-lg">{viewingPatron.surname}, {viewingPatron.firstname} {viewingPatron.middlename || ''}</p>
                                <p className="text-sm text-gray-500">{viewingPatron.library_id || 'No Library ID'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {[
                                ['Gender', viewingPatron.gender || '—'],
                                ['Date of Birth', viewingPatron.dateofbirth || '—'],
                                ['Email', viewingPatron.email],
                                ['Address', viewingPatron.address],
                                ['City', viewingPatron.city],
                                ['Status', viewingPatron.account_status || 'active'],
                                ['Created', viewingPatron.created_at ? new Date(viewingPatron.created_at).toLocaleDateString() : '—'],
                            ].map(([label, val]) => (
                                <div key={label}>
                                    <p className="text-xs text-gray-400 font-medium">{label}</p>
                                    <p className="text-gray-800">{val}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                            <button onClick={() => downloadPatronPDF(viewingPatron)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"><Download className="w-4 h-4" /> Download PDF</button>
                            <button onClick={() => setIsViewPatronModalOpen(false)} className="px-4 py-2 bg-[#00104A] text-white rounded-lg hover:opacity-90 font-medium text-sm">Close</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Grant Access Modal */}
            <Modal isOpen={isGrantAccessModalOpen} onClose={() => setIsGrantAccessModalOpen(false)} title="Grant Login Access" size="lg">
                {grantingPatron && (
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
                        {/* User Info Header */}
                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                            <div className="w-14 h-14 rounded-full bg-white border-2 border-white shadow overflow-hidden flex-shrink-0">
                                {grantingPatron.profile_photo_path ? <img src={grantingPatron.profile_photo_path} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center w-full h-full"><User className="w-6 h-6 text-gray-400" /></div>}
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">{grantingPatron.surname}, {grantingPatron.firstname} {grantingPatron.middlename || ''}</p>
                                <p className="text-sm text-gray-500">Library ID: <span className="font-mono text-blue-700">{grantingPatron.library_id}</span></p>
                                <p className="text-xs text-gray-400">Will login with Library ID and birthday ({grantingPatron.dateofbirth})</p>
                            </div>
                        </div>

                        {/* Role / Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Title / Role</label>
                            <select
                                value={grantAccessData.role || 'staff'}
                                onChange={e => handleGrantRoleChange(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#56CBF9] outline-none bg-white"
                            >
                                {ROLE_TITLES.map(rt => (
                                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Assignments */}
                        <div className="space-y-4 border-t border-gray-100 pt-4">
                            <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-500" /> Assignment Scope
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Branch *</label>
                                    <select
                                        value={grantAccessData.assigned_branch_id}
                                        onChange={e => setGrantAccessData({ ...grantAccessData, assigned_branch_id: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                    >
                                        <option value="">-- No Branch Assigned --</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Floor *</label>
                                    <select
                                        value={grantAccessData.assigned_floor_id}
                                        onChange={e => setGrantAccessData({ ...grantAccessData, assigned_floor_id: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                        disabled={!grantAccessData.assigned_branch_id}
                                    >
                                        <option value="">-- All Floors --</option>
                                        {grantFloors.map(f => <option key={f.id} value={f.id}>{f.label || `Floor ${f.floor_number}`}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-full">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Area *</label>
                                    <select
                                        value={grantAccessData.assigned_area_id}
                                        onChange={e => setGrantAccessData({ ...grantAccessData, assigned_area_id: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                        disabled={!grantAccessData.assigned_floor_id}
                                    >
                                        <option value="">-- All Areas --</option>
                                        {grantAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        Assigning a specific area limits the user's view to only that area's data in the Dashboard and other modules.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Module Permissions */}
                        <div className="space-y-4 border-t border-gray-100 pt-4">
                            <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-blue-500" /> Module Permissions
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {getModulesForRole(grantAccessData.role || 'staff').map(module => (
                                    <div
                                        key={module.key}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${grantAccessData.permissions[module.key] ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                                            }`}
                                        onClick={() => handleToggleGrantPermission(module.key)}
                                    >
                                        <span className={`text-sm font-medium ${grantAccessData.permissions[module.key] ? 'text-blue-900' : 'text-gray-600'}`}>
                                            {module.label}
                                        </span>
                                        {grantAccessData.permissions[module.key] ? (
                                            <ToggleRight className="w-5 h-5 text-blue-500" />
                                        ) : (
                                            <ToggleLeft className="w-5 h-5 text-gray-300" />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">Modules shown are based on the Title/Role selected above.</p>
                        </div>

                        <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>
                                Once this patron is granted access, they will be listed under "Active Personnel".
                                Branch and Area assignments can be modified later by editing the user.
                            </span>
                        </p>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                            <button onClick={() => setIsGrantAccessModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={handleGrantAccessSubmit} className="px-6 py-2 bg-[#00104A] text-white rounded-lg hover:opacity-90 font-medium flex items-center gap-2">
                                <KeyRound className="w-4 h-4" /> Grant Access
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Confirmation Modal */}
            <Modal isOpen={confirmModal.open} onClose={() => setConfirmModal({ open: false, title: '', message: '', onConfirm: null })} title={confirmModal.title} size="sm">
                <div className="text-center space-y-4">
                    <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertTriangle className="w-7 h-7 text-red-500" />
                    </div>
                    <p className="text-sm text-gray-600">{confirmModal.message}</p>
                    <div className="flex justify-center gap-3 pt-2">
                        <button
                            onClick={() => setConfirmModal({ open: false, title: '', message: '', onConfirm: null })}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                        >Cancel</button>
                        <button
                            onClick={confirmModal.onConfirm}
                            className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Success Modal (Access Granted) */}
            <Modal isOpen={successModal.open} onClose={() => setSuccessModal({ open: false, title: '', message: '', details: '' })} title={successModal.title} size="sm">
                <div className="text-center space-y-4">
                    <div className="mx-auto w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7 text-green-500" />
                    </div>
                    <p className="text-sm text-gray-600">{successModal.message}</p>
                    {successModal.details && (
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <p className="text-xs text-gray-400 mb-1">Login Credentials</p>
                            <p className="text-sm font-mono text-gray-800">{successModal.details}</p>
                        </div>
                    )}
                    <button
                        onClick={() => setSuccessModal({ open: false, title: '', message: '', details: '' })}
                        className="px-6 py-2 bg-[#00104A] text-white rounded-lg hover:opacity-90 font-medium text-sm"
                    >Done</button>
                </div>
            </Modal>

            {/* Already Granted Modal */}
            <Modal isOpen={alreadyGrantedModal.open} onClose={() => setAlreadyGrantedModal({ open: false, patronName: '' })} title="Already Has Access" size="sm">
                <div className="text-center space-y-4">
                    <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
                        <AlertCircle className="w-7 h-7 text-amber-500" />
                    </div>
                    <p className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-800">{alreadyGrantedModal.patronName}</span> already has login access. You can manage their permissions in the <span className="font-medium text-blue-600">Active Personnel</span> tab.
                    </p>
                    <button
                        onClick={() => setAlreadyGrantedModal({ open: false, patronName: '' })}
                        className="px-6 py-2 bg-[#00104A] text-white rounded-lg hover:opacity-90 font-medium text-sm"
                    >Got it</button>
                </div>
            </Modal>

        </div >
    );
}
