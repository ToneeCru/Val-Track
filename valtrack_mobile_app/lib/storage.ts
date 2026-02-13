import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

export const uploadSelfie = async (uri: string) => {
    try {
        const fileExt = uri.split('.').pop() || 'jpg';
        const fileName = `selfie_${Date.now()}.${fileExt}`;
        const filePath = `pending/${fileName}`;

        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
        });

        const { data, error } = await supabase.storage
            .from('selfie_uploads')
            .upload(filePath, decode(base64), {
                contentType: `image/${fileExt}`,
                upsert: false,
            });

        if (error) {
            throw error;
        }

        return data.path;
    } catch (error) {
        console.error('Error uploading selfie:', error);
        throw error;
    }
};

export const uploadIDToSupabase = async (uri: string, folder: string) => {

    try {
        const fileExt = uri.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
        });

        const { data, error } = await supabase.storage
            .from('id_uploads')
            .upload(filePath, decode(base64), {
                contentType: `image/${fileExt}`,
                upsert: false,
            });

        if (error) {
            throw error;
        }

        return data.path;
    } catch (error) {
        console.error('Error uploading ID:', error);
        throw error;
    }
};

export const createPendingRegistration = async (idType: string, path: string, ocrText: string, ocrStatus: string) => {
    try {
        const { data, error } = await supabase
            .from('pending_registrations')
            .insert([
                {
                    id_type: idType,
                    id_image_path: path,
                    ocr_raw_text: ocrText,
                    ocr_status: ocrStatus,
                },
            ])
            .select();

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error creating pending registration:', error);
        throw error;
    }
};
export const updatePendingRegistration = async (id: string, updates: any) => {
    try {
        const { data, error } = await supabase
            .from('pending_registrations')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error updating pending registration:', error);
        throw error;
    }
};
