import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { StatusBar } from "expo-status-bar";
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
  Alert,
  Image,
} from 'react-native';

import OverallHeader from '../AllHeader/OverallHeader';
import Navigation from '../Library Visitor/Navigation';

export default function ProfileAndSettings() {
  // State for Toggles
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Navigation Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Mock User Data
  const userData = {
    fullName: "Kim Ruds Guston",
    email: "kimruds.guston@example.com",
    joinedDate: "October 24, 2023",
    totalCheckIns: 42,
    libraryId: "2024-8492",
    birthdate: "November 15, 2002",
    barangay: "Maysan",
    contactNumber: "+63 9123456789",
    profileImage: "https://via.placeholder.com/100", // Placeholder
  };

  // Helper function to censor Library ID
  const censorLibraryId = (id: string) => {
    // Format: 2024-8492 -> 2024-****
    if (!id || !id.includes('-')) return id;
    const parts = id.split('-');
    return `${parts[0]}-****`;
  };

  // Helper function to censor Contact Number
  const censorContact = (number: string) => {
    // Format: +63 9123456789 -> +63 9** *** 6789
    return "+63 9** *** 6789";
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <OverallHeader
        onMenuPress={() => setIsDrawerOpen(true)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Title */}
        <Text style={styles.pageTitle}>Profile & Settings</Text>

        {/* Profile Card Section */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: userData.profileImage }}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.profileName}>{userData.fullName}</Text>
          <Text style={styles.profileEmail}>{userData.email}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Joined</Text>
              <Text style={styles.statValue}>{userData.joinedDate}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Check-ins</Text>
              <Text style={styles.statValue}>{userData.totalCheckIns}</Text>
            </View>
          </View>
        </View>

        {/* Personal Information Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <InfoRow label="Library ID" value={censorLibraryId(userData.libraryId)} />
          <InfoRow label="Full Name" value={userData.fullName} />
          <InfoRow label="Birthdate" value={userData.birthdate} />
          <InfoRow label="Barangay" value={userData.barangay} />
          <InfoRow label="Email" value={userData.email} />
          <InfoRow label="Contact Number" value={censorContact(userData.contactNumber)} />
        </View>

        {/* General Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>General</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelContainer}>
              <Ionicons name="moon-outline" size={22} color="#333" style={styles.iconLeft} />
              <Text style={styles.settingText}>Dark Mode</Text>
            </View>
            <Switch
              trackColor={{ false: "#E2E8F0", true: "#10B981" }}
              thumbColor={"#fff"}
              ios_backgroundColor="#E2E8F0"
              onValueChange={setDarkMode}
              value={darkMode}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelContainer}>
              <Ionicons name="notifications-outline" size={22} color="#333" style={styles.iconLeft} />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Switch
              trackColor={{ false: "#E2E8F0", true: "#10B981" }}
              thumbColor={"#fff"}
              ios_backgroundColor="#E2E8F0"
              onValueChange={setNotificationsEnabled}
              value={notificationsEnabled}
            />
          </View>
        </View>

        {/* Other Settings Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Other Settings</Text>

          <SettingLink
            icon="star-outline"
            label="Rate & Review"
            onPress={() => Alert.alert("Rate & Review", "Open store listing...")}
          />
          <SettingLink
            icon="document-text-outline"
            label="Terms of Use"
            onPress={() => Alert.alert("Terms of Use", "Navigate to Terms...")}
          />
          <SettingLink
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => Alert.alert("Privacy Policy", "Navigate to Privacy...")}
          />
        </View>

        {/* Bottom padding for scrolling */}
        <View style={{ height: 40 }} />

      </ScrollView>

      {/* Navigation Drawer */}
      <Navigation
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab="settings"
      />
    </SafeAreaView>
  );
}

// Helper Component for Info Rows
function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// Helper Component for Setting Links
function SettingLink({ icon, label, onPress }: { icon: any, label: string, onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.linkRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.toggleLabelContainer}>
        <Ionicons name={icon} size={22} color="#333" style={styles.iconLeft} />
        <Text style={styles.settingText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Light neutral background
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginVertical: 24,
    letterSpacing: 0.5,
  },

  // Profile Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    // Soft shadow
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarContainer: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E2E8F0',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-evenly',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },

  // Sections
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },

  // Info Rows
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },

  // Settings Rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    // Subtle shadow for items
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLeft: {
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
});
