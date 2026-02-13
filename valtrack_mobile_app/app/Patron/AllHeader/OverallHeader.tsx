/**
 * OverallHeader Component
 *
 * Consistent header used across all main tabs (Home, In/Out, Profile)
 * Features:
 * - Val-Track branding with logo image
 * - Notification bell icon with badge counter
 * - Responsive mobile design
 * - Consistent styling across all screens
 * - Touch-friendly notification button
 *
 * Props:
 * - notificationCount: Number of unread notifications
 * - onNotificationPress: Callback when notification bell is pressed
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Logo image (use require for RN bundler)
const valtrackLogo = require('../../assets/images/valtrackLogo2.png');

interface OverallHeaderProps {
  notificationCount?: number;
  onNotificationPress?: () => void;
}

/**
 * OverallHeader Component
 * Reusable header for all main app screens
 */
export default function OverallHeader({
  notificationCount = 0,
  onNotificationPress,
}: OverallHeaderProps) {
  return (
    <View style={styles.headerContainer}>
      {/* Left Section: Logo only */}
      <View style={styles.brandingSection}>
        {/* Logo Image */}
        <Image
          source={valtrackLogo}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Right Section: Notification Bell */}
      <TouchableOpacity
        style={styles.notificationButton}
        onPress={onNotificationPress}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${notificationCount} notifications`}
      >
        {/* Bell Icon */}
        <MaterialCommunityIcons
          name="bell"
          size={24}
          color="#001a4d"
        />

        {/* Notification Badge */}
        {notificationCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>
              {notificationCount > 99 ? '99+' : notificationCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },

  // Branding Section
  brandingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: -15, 
  },

  logo: {
    width: 100,
    height: 60,
    marginTop: 30,
  },

  // Notification Section
  notificationButton: {
    position: 'relative',
    paddingTop: 20,
    paddingRight: 5,
  },

  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
});
