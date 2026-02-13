import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

export const updateSelfieRecord = async (registrationId: string, filePath: string) => {
    try {
        const { data, error } = await supabase
            .from('pending_registrations')
            .update({
                selfie_with_id_path: filePath,
                status: 'pending',
            })
            .eq('id', registrationId)
            .select();

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error updating selfie record:', error);
        throw error;
    }
};
