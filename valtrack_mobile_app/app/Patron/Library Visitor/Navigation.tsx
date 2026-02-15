/**
 * Navigation Component (Sidebar Drawer)
 *
 * Transformed from bottom tabs to a sliding sidebar drawer.
 * Features:
 * - Animated slide-in/out
 * - Profile header
 * - Main navigation links
 * - Logout button
 * - Overlay background to close
 */

import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.8;

// Placeholder profile image
const defaultProfileImg = 'https://via.placeholder.com/60';

interface NavigationProps {
  activeTab?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Navigation({ activeTab = 'home', isOpen, onClose }: NavigationProps) {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      // Open Drawer
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Close Drawer
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const handleNavigation = (route: string) => {
    onClose();
    // Small delay to allow drawer to close before navigating (smoother UX)
    setTimeout(() => {
      if (route === 'dashboard') router.push('/Patron/Home/Dashboard');
      else if (route === 'qr') router.push('/Patron/QR/UserQRCode');
      else if (route === 'capacity') router.push('/Patron/Area Capacity/FloorAreaCapacity');
      else if (route === 'analytics') router.push('/Patron/UserAnalytics/CheckInAnalytics');
      else if (route === 'settings') router.push('/Patron/Settings/UserSettings');
    }, 200);
  };

  const handleLogout = () => {
    // Logic for logout confirmation
    onClose();

    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          onPress: () => { /* Do nothing */ },
          style: "cancel"
        },
        {
          text: "Yes, Logout",
          onPress: () => {
            // Redirect to login
            router.replace('/Patron/Library Visitor/LoginPage');
          },
          style: 'destructive'
        }
      ]
    );
  };

  // if (!isOpen && slideAnim._value === -DRAWER_WIDTH) return null; // Removed to avoid private property access and ensure animation works. Controlled by zIndex/pointerEvents.
  // *Correction*: We should render it to allow animation out. We can control visibility via pointerEvents or zIndex if needed, but absolute positioning handles it.

  return (
    <View style={[styles.container, !isOpen && { pointerEvents: 'none' }]}>
      {/* Background Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* Drawer Content */}
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* Header: User Info & Close Button */}
        <View style={styles.header}>
          <View style={styles.userInfoRow}>
            <Image source={{ uri: defaultProfileImg }} style={styles.profileImg} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Alex Doe</Text>
              <Text style={styles.userRole}>Library User</Text>
            </View>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Navigation Items */}
        <View style={styles.navItems}>
          <NavItem
            icon="view-dashboard"
            label="Dashboard"
            isActive={activeTab === 'home' || activeTab === 'dashboard' || activeTab === 'Dashboard'}
            onPress={() => handleNavigation('dashboard')}
          />
          <NavItem
            icon="qrcode"
            label="QR Code"
            isActive={activeTab === 'qr'}
            onPress={() => handleNavigation('qr')}
          />
          <NavItem
            icon="floor-plan"
            label="Floor Area Capacity"
            isActive={activeTab === 'capacity'}
            onPress={() => handleNavigation('capacity')}
          />
          <NavItem
            icon="chart-bar"
            label="Analytics"
            isActive={activeTab === 'inout' || activeTab === 'analytics'}
            onPress={() => handleNavigation('analytics')}
          />
          <NavItem
            icon="cog"
            label="Settings"
            isActive={activeTab === 'settings' || activeTab === 'profile'}
            onPress={() => handleNavigation('settings')}
          />
        </View>

        {/* Footer: Logout */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color="#FF2B2B" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </View>
  );
}

function NavItem({ icon, label, isActive, onPress }: { icon: any, label: string, isActive: boolean, onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.navItem, isActive && styles.navItemActive]}
      onPress={onPress}
    >
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={isActive ? '#F8FAFC' : '#F8FAFC'} // Always light text
        style={{ opacity: isActive ? 1 : 0.7 }}
      />
      <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000, // Above everything
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#00104A', // Deep Blue
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    justifyContent: 'space-between', // Push footer down
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Space between user info and close btn
    marginBottom: 40,
    marginTop: 20,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRole: {
    color: '#ccc',
    fontSize: 13,
  },
  navItems: {
    flex: 1, // Take available space
    gap: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 30, // Pill shape
  },
  navItemActive: {
    backgroundColor: '#FF2B2B', // Val-Track Red
  },
  navLabel: {
    marginLeft: 15,
    fontSize: 16,
    color: '#F8FAFC',
    opacity: 0.7,
  },
  navLabelActive: {
    fontWeight: 'bold',
    opacity: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 20,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  logoutText: {
    color: '#FF2B2B',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
});
