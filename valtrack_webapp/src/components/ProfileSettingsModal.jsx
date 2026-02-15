import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Camera, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';

export default function ProfileSettingsModal({ isOpen, onClose, onUpdate }) {
    const { profile, refreshProfile } = useAuth();
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        password: '',
        avatarUrl: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen && profile) {
            setFormData({
                fullName: profile.full_name || '',
                username: profile.username || '',
                password: '',
                avatarUrl: profile.avatar_url || ''
            });
        }
    }, [isOpen, profile]);

    const handleFileChange = async (event) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${profile?.id}/${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // 2. Get Public URL
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, avatarUrl: data.publicUrl }));
            toast.success('Image uploaded successfully!');

        } catch (error) {
            console.error('Error uploading avatar:', error);
            toast.error('Error uploading avatar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (!profile || !profile.id) {
                toast.error('Session expired. Please login again.');
                return;
            }

            const updates = {
                full_name: formData.fullName,
                username: formData.username,
                avatar_url: formData.avatarUrl
            };

            // Only include password if it's applying
            if (profile.role !== 'staff' && formData.password && formData.password.trim() !== '') {
                updates.password = formData.password;
            }

            // Determine detailed changes for audit log
            const changeDetails = [];
            if (formData.avatarUrl !== profile.avatar_url) changeDetails.push('Profile Picture');
            if (formData.fullName !== profile.full_name) changeDetails.push(`Name ("${profile.full_name}" → "${formData.fullName}")`);
            if (formData.username !== profile.username) changeDetails.push(`Username ("${profile.username}" → "${formData.username}")`);
            if (formData.password) changeDetails.push('Password');

            // 1. Update Profile in DB
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', profile.id);

            if (error) throw error;

            // 2. Audit Log
            await supabase.from('audit_logs').insert({
                user_name: formData.fullName,
                action: 'Profile Updated',
                module: 'User Profile',
                details: `Updated personal profile: ${changeDetails.length > 0 ? changeDetails.join(' | ') : 'No changes detected'}`,
                timestamp: new Date().toISOString()
            });

            // 3. Update Auth Context
            await refreshProfile();

            // 4. Notify Parent if needed
            if (onUpdate) onUpdate({ ...profile, ...updates });

            toast.success('Profile updated successfully!');
            onClose();

        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile: ' + (error.message || 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-md"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative z-10"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">{profile?.role === 'admin' ? 'Administrative Profile Settings' : 'Edit Profile'}</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Avatar Upload */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                                        {formData.avatarUrl ? (
                                            <img
                                                src={formData.avatarUrl}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <Camera className="w-8 h-8" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white">
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                />
                                <p className="text-xs text-gray-500">Click to upload new picture</p>
                            </div>

                            {/* Inputs */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#56CBF9]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#56CBF9]"
                                    />
                                </div>

                                {profile?.role !== 'staff' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            New Password <span className="text-gray-400 font-normal">(Leave blank to keep)</span>
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#56CBF9]"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || uploading}
                                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[#00104A] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-70"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
}
