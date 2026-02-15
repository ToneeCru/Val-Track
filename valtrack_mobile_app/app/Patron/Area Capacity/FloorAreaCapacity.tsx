
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OverallHeader from '../AllHeader/OverallHeader';
import Navigation from '../Library Visitor/Navigation';
import Footer from '../Home/Footer';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function FloorAreaCapacity() {
    const router = useRouter();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <View style={styles.container}>
            <OverallHeader
                onMenuPress={() => setIsDrawerOpen(true)}
                onNotificationPress={() => router.push('/Patron/Home/Notification')}
                notificationCount={0}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    <Text style={styles.title}>Floor Area Capacity</Text>
                    <Text style={styles.subtitle}>Real-time occupancy tracking coming soon.</Text>

                    {/* Placeholder for capacity content */}
                    <View style={styles.placeholderCard}>
                        <Text style={styles.placeholderText}>Capacity Chart Placeholder</Text>
                    </View>
                </View>

                <Footer />
                <View style={{ height: 100 }} />
            </ScrollView>

            <Navigation
                activeTab="capacity"
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#00104A',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    placeholderCard: {
        height: 200,
        backgroundColor: '#fff',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderStyle: 'dashed',
    },
    placeholderText: {
        color: '#999',
    }
});
