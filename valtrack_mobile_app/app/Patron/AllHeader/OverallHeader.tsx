/**
 * OverallHeader Component
 *
 * Consistent header used across all main tabs.
 * Features:
 * - Hamburger Menu (Left)
 * - Val-Track Branding (Left-Center)
 * - QR Code Shortuct (Right)
 * - Notification Bell (Right)
 * - Profile Icon (Right)
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

const { width } = Dimensions.get('window');

// Logo image
const valtrackLogo = require('../../assets/images/valtrackLogo2.png');

interface OverallHeaderProps {
  notificationCount?: number;
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
  onQrPress?: () => void;
}

export default function OverallHeader({
  notificationCount = 0,
  onMenuPress,
  onNotificationPress,
  onQrPress,
}: OverallHeaderProps) {
  return (
    <View style={styles.headerContainer}>

      {/* Left Section: Menu & Logo */}
      <View style={styles.leftSection}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onMenuPress}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="menu" size={28} color="#001a4d" />
        </TouchableOpacity>

        <Image
          source={valtrackLogo}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Right Section: Actions */}
      <View style={styles.rightSection}>
        {/* QR Code Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onQrPress}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={24} color="#001a4d" />
        </TouchableOpacity>

        {/* Notification Bell */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onNotificationPress}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="bell-outline" size={24} color="#001a4d" />
          {notificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>
                {notificationCount > 99 ? '99+' : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 45, // Status bar formatting
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 100,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 100,
    height: 50,
    marginLeft: -20,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // Increased gap slightly for better touch targets
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF2B2B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
  },
});
