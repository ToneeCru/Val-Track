/**
 * Dashboard.tsx
 * 
 * Main dashboard component for the Val-Track Library Management mobile app.
 * Displays an overview of library statistics, room capacity, opening hours,
 * branches, announcements, services, and contact information.
 * 
 * Features:
 * - Responsive mobile-first design
 * - Modern card-based layout with soft shadows
 * - Real-time statistics display
 * - Room capacity progress indicators
 * - Multiple informational sections
 * - Accessibility optimized
 */

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from "expo-status-bar";
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import OverallHeader from "../AllHeader/OverallHeader";
import Navigation from '../Library Visitor/Navigation';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const { width } = Dimensions.get('window');

// Logo image
const valtrackLogo = require('../../assets/images/valtrackLogo.png');

/**
 * StatCard Component
 * Displays a single statistic with icon, label, and value
 */
function StatCard({
  icon,
  label,
  value,
  description,
  accentColor,
  lightIconBg,
}: {
  icon: IconName;
  label: string;
  value: string;
  description: string;
  accentColor: string;
  lightIconBg: string;
}) {
  return (
    <View style={[styles.statCard]}>
      {/* Icon background circle */}
      <View
        style={[
          styles.iconBackground,
          { backgroundColor: lightIconBg },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={28} color={accentColor} />
      </View>

      {/* Content */}
      <View style={styles.statContent}>
        <ThemedText
          style={styles.statLabel}
          lightColor="#666"
          darkColor="#999"
        >
          {label}
        </ThemedText>
        <ThemedText
          type="title"
          style={[styles.statValue, { color: accentColor }]}
        >
          {value}
        </ThemedText>
        <ThemedText
          style={styles.statDescription}
          lightColor="#999"
          darkColor="#666"
        >
          {description}
        </ThemedText>
      </View>
    </View>
  );
}

/**
 * ProgressBar Component
 * Displays a single floor's capacity with percentage
 */
function FloorCapacityBar({
  floor,
  current,
  total,
  color,
}: {
  floor: string;
  current: number;
  total: number;
  color: string;
}) {
  const percentage = (current / total) * 100;
  const bgColor = useThemeColor({}, 'background');

  return (
    <View style={styles.floorItem}>
      {/* Floor label and percentage */}
      <View style={styles.floorHeader}>
        <ThemedText type="defaultSemiBold" style={styles.floorLabel}>
          {floor}
        </ThemedText>
        <ThemedText
          style={[styles.floorPercentage, { color }]}
          type="defaultSemiBold"
        >
          {current}/{total} {percentage.toFixed(0)}%
        </ThemedText>
      </View>

      {/* Progress bar container */}
      <View style={[styles.progressBarContainer, { backgroundColor: '#e5e5e5' }]}>
        {/* Filled portion */}
        <View
          style={[
            styles.progressBarFilled,
            {
              width: `${percentage}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

/**
 * InfoCard Component
 * Displays generic information section (opening hours, branches, etc.)
 */
function InfoCard({
  icon,
  title,
  children,
  borderLeftColor,
}: {
  icon: IconName;
  title: string;
  children: React.ReactNode;
  borderLeftColor: string;
}) {
  return (
    <View
      style={[
        styles.infoCard,
        {
          borderLeftColor: borderLeftColor,
        },
      ]}
    >
      <View style={styles.infoHeader}>
        <MaterialCommunityIcons
          name={icon}
          size={24}
          color={borderLeftColor}
          style={styles.infoIcon}
        />
        <ThemedText type="title" style={styles.infoTitle}>
          {title}
        </ThemedText>
      </View>
      <View style={styles.infoContent}>{children}</View>
    </View>
  );
}

/**
 * ServiceButton Component
 * Displays a service option with icon
 */
function ServiceButton({
  icon,
  label,
  color,
}: {
  icon: IconName;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.serviceButton}>
      <View style={[styles.serviceIcon, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={32} color={color} />
      </View>
      <ThemedText
        style={styles.serviceLabel}
        lightColor="#11181C"
        darkColor="#ECEDEE"
      >
        {label}
      </ThemedText>
    </View>
  );
}

/**
 * Main Dashboard Component
 */
export default function Dashboard() {
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {/* OverallHeader is displayed here - no duplicate header */}
      <OverallHeader />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Today's Overview Section */}
        <View style={styles.section}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Today's Overview
          </ThemedText>

          <View style={styles.statsGrid}>
            <StatCard
              icon="account-multiple"
              label="Active Users Today"
              value="250"
              description="Current active visitors"
              accentColor="#10B981"
              lightIconBg="#ECFDF5"
            />
            <StatCard
              icon="account-plus"
              label="Total Created Users"
              value="1,280"
              description="Cumulative registered users"
              accentColor="#00104A"
              lightIconBg="#E3F2FD"
            />
          </View>
        </View>

        {/* Room Floor Capacity Section */}
        <View style={styles.section}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Room Floor Capacity
          </ThemedText>

          <View style={styles.capacityContainer}>
            <FloorCapacityBar floor="Floor 1" current={45} total={50} color="#00104A" />
            <FloorCapacityBar floor="Floor 2" current={78} total={100} color="#00104A" />
            <FloorCapacityBar floor="Floor 3" current={92} total={120} color="#00104A" />
            <FloorCapacityBar floor="Floor 4" current={34} total={60} color="#00104A" />
          </View>
        </View>

        {/* Opening Hours Section */}
        <View style={styles.section}>
          <InfoCard
            icon="clock-outline"
            title="Opening Hours"
            borderLeftColor="#56CBF9"
          >
            <View style={styles.hoursContent}>
              <View style={styles.hourRow}>
                <ThemedText
                  style={styles.dayLabel}
                  lightColor="#232323"
                  darkColor="#F8FAFC"
                >
                  Monday - Friday
                </ThemedText>
                <ThemedText
                  style={styles.timeLabel}
                  lightColor="#666"
                  darkColor="#999"
                >
                  9:00 AM - 5:00 PM
                </ThemedText>
              </View>
              <View style={styles.divider} />
              <View style={styles.hourRow}>
                <ThemedText
                  style={styles.dayLabel}
                  lightColor="#11181C"
                  darkColor="#ECEDEE"
                >
                  Saturday
                </ThemedText>
                <ThemedText
                  style={styles.timeLabel}
                  lightColor="#666"
                  darkColor="#999"
                >
                  10:00 AM - 3:00 PM
                </ThemedText>
              </View>
              <View style={styles.divider} />
              <View style={styles.hourRow}>
                <ThemedText
                  style={styles.dayLabel}
                  lightColor="#11181C"
                  darkColor="#ECEDEE"
                >
                  Sunday
                </ThemedText>
                <ThemedText style={styles.closedLabel} lightColor="#DC2626" darkColor="#FF6B6B">
                  Closed
                </ThemedText>
              </View>
              <ThemedText
                style={styles.closingNote}
                lightColor="#999"
                darkColor="#666"
              >
              </ThemedText>
            </View>
          </InfoCard>
        </View>

        {/* Our Branches Section */}
        <View style={styles.section}>
          <InfoCard
            icon="map-marker"
            title="Our Branches"
            borderLeftColor="#DC2626"
          >
            <View style={styles.branchContent}>
              <View style={styles.branchItem}>
                <View style={styles.branchInfo}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={styles.branchName}
                  >
                    Main City Library
                  </ThemedText>
                  <ThemedText
                    style={styles.branchAddress}
                    lightColor="#666"
                    darkColor="#999"
                  >
                    McArthur Highway cor. A. Pablo Street
                  </ThemedText>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#666"
                />
              </View>
            </View>
          </InfoCard>
        </View>

        {/* Latest Announcements Section */}
        <View style={styles.section}>
          <InfoCard
            icon="bell-outline"
            title="Latest Announcements"
            borderLeftColor="#007AFF"
          >
            <View style={styles.announcementContent}>
              <ThemedText
                type="defaultSemiBold"
                style={styles.announcementTitle}
              >
                Happy World Read Aloud Day!📖
              </ThemedText>
              <ThemedText
                style={styles.announcementDate}
                lightColor="#666"
                darkColor="#999"
              >
                02-11-2026
              </ThemedText>
              <ThemedText
                style={styles.announcementText}
                lightColor="#666"
                darkColor="#999"
              >
                Sa pagdiriwang ng World Read Aloud Day ngayong buwan ng Pebrero, 
                masayang nakibahagi ang Valenzuela City Library kasama ang mga 
                mag-aaral mula sa Antonio M. Serapio Elementary School. 
                Sabay-sabay nilang binasa ang kuwentong “𝗔𝗻𝗴 𝗧𝗮𝗹𝗶𝗻𝗴 𝗛𝗶𝗻𝗱𝗶 𝗠𝗮𝗶𝘁𝗮𝗹𝗶” 
                na isinulat ni Mikhaila Avendaño at iginuhit ni Angeline Alipio. 

              </ThemedText>
            </View>
          </InfoCard>
        </View>

        {/* Available Services Section */}
        <View style={styles.section}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Available Services
          </ThemedText>

          <View style={styles.servicesGrid}>
            <ServiceButton icon="book-multiple" label="Book Borrowing" color="#56CBF9" />
            <ServiceButton
              icon="laptop"
              label="Public Computers & Free Wi-Fi"
              color="#56CBF9"
            />
            <ServiceButton icon="calendar" label="Study Spaces" color="#56CBF9" />
            <ServiceButton icon="help-circle" label="Library Assistance" color="#56CBF9" />
          </View>
        </View>

        {/* Contact Us Section */}
        <View style={styles.section}>
          <ThemedText type="title" style={styles.sectionTitle}>
            Contact Us
          </ThemedText>

          <View style={styles.contactContainer}>
            {/* Phone Support */}
            <View style={[styles.contactItem, { borderLeftColor: '#00104A' }]}>
              <MaterialCommunityIcons
                name="phone"
                size={24}
                color="#00104A"
                style={styles.contactIcon}
              />
              <View style={styles.contactContent}>
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.contactLabel}
                >
                  Have a Question?
                </ThemedText>
                <ThemedText
                  style={styles.contactValue}
                  lightColor="#666"
                  darkColor="#999"
                >
                  (555) 000-1234
                </ThemedText>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#999"
              />
            </View>

            {/* Email Support */}
            <View style={[styles.contactItem, { borderLeftColor: '#00104A', marginTop: 16 }]}>
              <MaterialCommunityIcons
                name="email-outline"
                size={24}
                color="#00104A"
                style={styles.contactIcon}
              />
              <View style={styles.contactContent}>
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.contactLabel}
                >
                  Email Support
                </ThemedText>
                <ThemedText
                  style={styles.contactValue}
                  lightColor="#666"
                  darkColor="#999"
                >
                  support@valtrack-library.org
                </ThemedText>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#999"
              />
            </View>
          </View>
        </View>

        {/* Bottom padding for scrollable view */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky Navigation */}
      <Navigation activeTab="home" />
    </View>
  );
}

/**
 * StyleSheet Definitions
 * 
 * Mobile-first responsive design with:
 * - Soft shadows for depth
 * - Rounded corners for modern look
 * - Adequate spacing and padding
 * - Readable typography hierarchy
 * - Touch-friendly component sizes
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  /* Section Styles */
  section: {
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },

  /* Stat Card Styles */
  statsGrid: {
    gap: 12,
  },
  statCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconBackground: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  statContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statDescription: {
    fontSize: 12,
    fontWeight: '400',
  },

  /* Floor Capacity Styles */
  capacityContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    gap: 20,
  },
  floorItem: {
    gap: 8,
  },
  floorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floorLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  floorPercentage: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFilled: {
    height: '100%',
    borderRadius: 4,
  },

  /* Info Card Styles */
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoContent: {
    gap: 12,
  },

  /* Opening Hours Styles */
  hoursContent: {
    gap: 12,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '400',
  },
  closedLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
  },
  closingNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },

  /* Branch Styles */
  branchContent: {
    gap: 12,
  },
  branchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  branchIcon: {
    marginRight: 12,
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  branchAddress: {
    fontSize: 12,
    fontWeight: '400',
  },

  /* Announcement Styles */
  announcementContent: {
    gap: 8,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  announcementDate: {
    fontSize: 12,
    fontWeight: '400',
  },
  announcementText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },

  /* Services Styles */
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  serviceButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Contact Styles */
  contactContainer: {
    gap: 0,
  },
  contactItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  contactIcon: {
    marginRight: 12,
    marginLeft: 4,
  },
  contactContent: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 12,
    fontWeight: '400',
  },
});
