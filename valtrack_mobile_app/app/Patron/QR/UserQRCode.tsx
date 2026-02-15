import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OverallHeader from '../AllHeader/OverallHeader';
import Navigation from '../Library Visitor/Navigation';


const { width } = Dimensions.get('window');

export default function UserQRCode() {
    const router = useRouter();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Mock User Data
    const userData = {
        name: "Alex Doe",
        id: "2024-8492",
        type: "Regular Patron"
    };

    return (
        <View style={styles.container}>
            <OverallHeader
                onMenuPress={() => setIsDrawerOpen(true)}
                onNotificationPress={() => router.push('/Patron/Home/Notification')}
                notificationCount={2}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    <Text style={styles.pageTitle}>My QR Code</Text>
                    <Text style={styles.pageSubtitle}>Scan this code at the entrance/exit kiosk</Text>

                    <View style={styles.qrCard}>
                        <View style={styles.qrHeader}>
                            <MaterialCommunityIcons name="qrcode-scan" size={24} color="#00104A" />
                            <Text style={styles.qrHeaderText}>DIGITAL ID</Text>
                        </View>

                        <View style={styles.qrContainer}>
                            {/* Placeholder for actual QR Code generation */}
                            <MaterialCommunityIcons name="qrcode" size={200} color="#000" />
                        </View>

                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{userData.name}</Text>
                            <Text style={styles.userId}>{userData.id}</Text>
                            <View style={styles.userTypeBadge}>
                                <Text style={styles.userTypeText}>{userData.type}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.instructionCard}>
                        <MaterialCommunityIcons name="information-outline" size={20} color="#5B67CA" style={styles.infoIcon} />
                        <Text style={styles.instructionText}>
                            Ensure your screen brightness is set to maximum for easier scanning.
                        </Text>
                    </View>
                </View>


                <View style={{ height: 100 }} />
            </ScrollView>

            <Navigation
                activeTab="qr"
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
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#00104A',
        marginBottom: 4,
        marginTop: 10,
    },
    pageSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 30,
        textAlign: 'center',
    },
    qrCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 30,
        width: '100%',
        maxWidth: 350,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        marginBottom: 30,
    },
    qrHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        opacity: 0.5,
    },
    qrHeaderText: {
        marginLeft: 8,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
        color: '#00104A',
    },
    qrContainer: {
        padding: 10,
        backgroundColor: '#fff',
        marginBottom: 20,
    },
    userInfo: {
        alignItems: 'center',
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 20,
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    userId: {
        fontSize: 16,
        color: '#666',
        marginBottom: 12,
        fontFamily: 'monospace',
    },
    userTypeBadge: {
        backgroundColor: '#E6FFFA',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#10B981',
    },
    userTypeText: {
        fontSize: 12,
        color: '#10B981',
        fontWeight: 'bold',
    },
    instructionCard: {
        flexDirection: 'row',
        backgroundColor: '#EEF0FF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
        maxWidth: 350,
    },
    infoIcon: {
        marginRight: 12,
    },
    instructionText: {
        fontSize: 14,
        color: '#5B67CA',
        flex: 1,
        lineHeight: 20,
    },
});
