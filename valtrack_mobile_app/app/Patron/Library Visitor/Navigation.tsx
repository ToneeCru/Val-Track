/**
 * Navigation Component
 *
 * Sticky bottom navigation bar with three main tabs:
 * - Home: Dashboard view
 * - In/Out: Analytics view
 * - Profile: User profile view
 *
 * Features:
 * - Fixed position (sticky) at the bottom of the screen
 * - Active tab highlighting
 * - Smooth navigation between screens
 * - Responsive design for mobile devices
 */

import { MaterialIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface NavigationProps {
  activeTab?: string;
}

/**
 * Navigation Component
 * Provides sticky bottom navigation for the app
 */
export default function Navigation({ activeTab = 'home' }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Determine active tab based on current pathname
  const active = useMemo(() => {
    if (pathname.includes('Dashboard')) return 'home';
    if (pathname.includes('InOutAnalytics')) return 'inout';
    if (pathname.includes('UserProfile')) return 'profile';
    return activeTab || 'home';
  }, [pathname, activeTab]);

  /**
   * Navigate to Home (Dashboard)
   */
  const handleHomePress = () => {
    router.push('/Patron/Home/Dashboard');
  };

  /**
   * Navigate to In/Out (Analytics)
   */
  const handleInOutPress = () => {
    router.push('/Patron/In&Out/InOutAnalytics');
  };

  /**
   * Navigate to Profile (User Profile)
   */
  const handleProfilePress = () => {
    router.push('/Patron/Profile/UserProfile');
  };

  return (
    <View style={styles.navigationContainer}>
      {/* Home Tab */}
      <TouchableOpacity
        style={[
          styles.navTab,
          active === 'home' && styles.navTabActive,
        ]}
        onPress={handleHomePress}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="home"
          size={24}
          color={active === 'home' ? '#001a4d' : '#999'}
        />
        <Text
          style={[
            styles.navLabel,
            active === 'home' && styles.navLabelActive,
          ]}
        >
          Home
        </Text>
      </TouchableOpacity>

      {/* In/Out Tab */}
      <TouchableOpacity
        style={[
          styles.navTab,
          active === 'inout' && styles.navTabActive,
        ]}
        onPress={handleInOutPress}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="input"
          size={24}
          color={active === 'inout' ? '#001a4d' : '#999'}
        />
        <Text
          style={[
            styles.navLabel,
            active === 'inout' && styles.navLabelActive,
          ]}
        >
          In/Out
        </Text>
      </TouchableOpacity>

      {/* Profile Tab */}
      <TouchableOpacity
        style={[
          styles.navTab,
          active === 'profile' && styles.navTabActive,
        ]}
        onPress={handleProfilePress}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="person"
          size={24}
          color={active === 'profile' ? '#001a4d' : '#999'}
        />
        <Text
          style={[
            styles.navLabel,
            active === 'profile' && styles.navLabelActive,
          ]}
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  navigationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 12,
    paddingBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    zIndex: 100,
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: width * 0.05,
    paddingVertical: 8,
  },
  navTabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#001a4d',
    paddingVertical: 5,
  },
  navLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginTop: 4,
  },
  navLabelActive: {
    color: '#001a4d',
    fontWeight: '700',
  },
});
