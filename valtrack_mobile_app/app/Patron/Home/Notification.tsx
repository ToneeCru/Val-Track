
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Modal,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

// --- Types ---
interface NotificationItem {
    id: string;
    title: string;
    description: string;
    timestamp: string;
    isRead: boolean;
    category: 'NEW' | 'TODAY' | 'EARLIER';
}

// --- Mock Data ---
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
    {
        id: '1',
        title: 'Platform Maintenance Scheduled',
        description: 'Our systems will be undergoing brief maintenance this Sunday between 2:00',
        timestamp: '2m ago',
        isRead: false,
        category: 'NEW',
    },
    {
        id: '2',
        title: 'New Feature: Dark Mode',
        description: 'You can now switch between light and dark themes in your account settings for a',
        timestamp: '15m ago',
        isRead: false,
        category: 'NEW',
    },
    {
        id: '3',
        title: 'Security Alert: New Login',
        description: 'A new login was detected from a Chrome browser on a MacOS device in Brooklyn,',
        timestamp: '4h ago',
        isRead: true,
        category: 'TODAY',
    },
    {
        id: '4',
        title: 'Monthly Newsletter: June',
        description: 'Check out the top stories and product updates from the past month in our',
        timestamp: '2 days ago',
        isRead: true,
        category: 'EARLIER',
    },
    {
        id: '5',
        title: 'Welcome to the Community!',
        description: 'Thanks for joining us! Start by exploring our community guidelines and saying',
        timestamp: '1 week ago',
        isRead: true,
        category: 'EARLIER',
    },
];

export default function Notification() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);

    // --- Actions ---

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.push('/Patron/Home/Dashboard'); // Fallback
        }
    };

    const markAllAsRead = () => {
        const updated = notifications.map(n => ({ ...n, isRead: true }));
        setNotifications(updated);
    };

    const handleDelete = (id: string) => {
        const updated = notifications.filter(n => n.id !== id);
        setNotifications(updated);
        setModalVisible(false);
    };

    const confirmDelete = (id: string) => {
        setSelectedNotificationId(id);
        setModalVisible(true);
    };

    // --- Render Items ---

    const renderRightActions = (id: string) => {
        return (
            <TouchableOpacity
                style={styles.deleteAction}
                onPress={() => handleDelete(id)}
            >
                <MaterialCommunityIcons name="trash-can-outline" size={24} color="#fff" />
                <Text style={styles.deleteActionText}>DELETE</Text>
            </TouchableOpacity>
        );
    };

    const NotificationRow = ({ item }: { item: NotificationItem }) => (
        <Swipeable renderRightActions={() => renderRightActions(item.id)}>
            <TouchableOpacity
                style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
                onLongPress={() => confirmDelete(item.id)}
                activeOpacity={0.9} // Slight feedback
            >
                {/* Icon */}
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="bullhorn-outline" size={20} color="#fff" />
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, !item.isRead && styles.boldTitle]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <Text style={styles.timestamp}>{item.timestamp}</Text>
                    </View>
                    <Text style={styles.description} numberOfLines={2}>
                        {item.description}
                    </Text>
                </View>

                {/* Unread Dot */}
                {!item.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        </Swipeable>
    );

    // Grouping Data
    const groupedData = [
        { title: 'NEW', data: notifications.filter(n => n.category === 'NEW') },
        { title: 'TODAY', data: notifications.filter(n => n.category === 'TODAY') },
        { title: 'EARLIER', data: notifications.filter(n => n.category === 'EARLIER') },
    ].filter(section => section.data.length > 0);


    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#00104A" />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color="#F8FAFC" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <TouchableOpacity onPress={markAllAsRead}>
                        <Text style={styles.markReadText}>Mark all read</Text>
                    </TouchableOpacity>
                </View>

                {/* List */}
                <View style={styles.listContainer}>
                    {notifications.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="bell-off-outline" size={48} color="#ccc" />
                            <Text style={styles.emptyTitle}>No notifications yet.</Text>
                            <Text style={styles.emptySub}>You’ll see announcements here.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={groupedData}
                            keyExtractor={(item) => item.title}
                            renderItem={({ item }) => (
                                <View>
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionHeaderText}>{item.title}</Text>
                                    </View>
                                    {item.data.map(notification => (
                                        <NotificationRow key={notification.id} item={notification} />
                                    ))}
                                </View>
                            )}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>

                {/* Delete Modal */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Delete Notification?</Text>
                            <Text style={styles.modalMessage}>Are you sure you want to remove this notification?</Text>
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.cancelBtn]}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.deleteBtn]}
                                    onPress={() => selectedNotificationId && handleDelete(selectedNotificationId)}
                                >
                                    <Text style={styles.deleteBtnText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    // Header
    header: {
        backgroundColor: '#00104A',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10, // Adjust for safe area if needed, mostly handled by SafeAreaView
        paddingBottom: 16,
        height: 60,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#F8FAFC',
    },
    markReadText: {
        color: '#4DA6FF', // Distinct clickable color against dark bg
        fontSize: 14,
        fontWeight: '600',
    },

    // List
    listContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    sectionHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F8FAFC',
    },
    sectionHeaderText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#888',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },

    // Item
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    unreadItem: {
        backgroundColor: '#fff', // Or slightly highlighted? Design looks white but bold text.
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#40C4FF', // Light blue icon bg
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contentContainer: {
        flex: 1,
        marginRight: 8,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    title: {
        fontSize: 15,
        color: '#333',
        flex: 1,
        marginRight: 8,
    },
    boldTitle: {
        fontWeight: 'bold',
        color: '#000',
    },
    timestamp: {
        fontSize: 12,
        color: '#888',
    },
    description: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#40C4FF',
        marginTop: 6,
    },

    // Swipe Action
    deleteAction: {
        backgroundColor: '#FF2B2B',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
    },
    deleteActionText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4,
    },

    // Empty State
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 100,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
    },
    emptySub: {
        fontSize: 14,
        color: '#888',
        marginTop: 8,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: width * 0.8,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    modalMessage: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        lineHeight: 20,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    cancelBtn: {
        backgroundColor: '#f0f0f0',
    },
    deleteBtn: {
        backgroundColor: '#FF2B2B',
    },
    cancelBtnText: {
        color: '#333',
        fontWeight: '600',
    },
    deleteBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
});
