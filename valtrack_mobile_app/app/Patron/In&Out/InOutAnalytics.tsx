/**
 * InOutAnalytics.tsx
 * 
 * In/Out Management screen for the Val-Track Library Management mobile app.
 * Displays check-in/check-out functionality, QR token management, and
 * usage analytics including daily check-ins and weekly user activity.
 * 
 * Features:
 * - Large action buttons for check in/out
 * - QR token display with expiration timer
 * - Regenerate QR code functionality
 * - Daily check-ins trend visualization
 * - Weekly active users analytics
 * - Fixed bottom navigation
 * - Responsive mobile-first design
 * - Dark mode support
 * - Accessibility optimized
 */

import { ThemedText } from '@/components/themed-text';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import OverallHeader from "../AllHeader/OverallHeader";
import Navigation from '../Library Visitor/Navigation';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const { width } = Dimensions.get('window');

/**
 * StatusIndicator Component
 * Displays current check-in status with colored indicator
 */
function StatusIndicator({ label, isActive }: { label: string; isActive: boolean }) {
  return (
    <View style={styles.statusContainer}>
      <View
        style={[
          styles.statusDot,
          { backgroundColor: isActive ? '#FF2B2B' : '#10B981' },
        ]}
      />
      <ThemedText type="defaultSemiBold" style={styles.statusText}>
        {label}
      </ThemedText>
    </View>
  );
}

/**
 * ActionButton Component
 * Large primary button for check in/out actions
 * Supports disabled state for button management
 */
function ActionButton({
  icon,
  label,
  onPress,
  variant = 'primary',
  isDisabled = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger';
  isDisabled?: boolean;
}) {
  const backgroundColor = variant === 'danger' ? '#FF2B2B' : '#10B981';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={isDisabled ? 0.5 : 0.8}
      style={[styles.actionButton, { backgroundColor, opacity: isDisabled ? 0.5 : 1 }]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
    >
      <MaterialCommunityIcons name={icon} size={48} color="#fff" />
      <ThemedText
        style={[styles.actionButtonText, { color: '#fff' }]}
        type="defaultSemiBold"
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}

/**
 * QRCard Component
 * Displays QR token with expiration and regenerate option
 */
function QRCard() {
  const [expiresIn, setExpiresIn] = useState(15);
  const [qrToken] = useState('VAL-2970-2025-02-09');

  // Simulate countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const handleGenerateQR = () => {
    Alert.alert('Success', 'New QR code generated successfully!', [
      { text: 'OK', onPress: () => setExpiresIn(15) },
    ]);
  };

  const isExpiringSoon = expiresIn <= 5;

  return (
    <View style={styles.qrCard}>
      {/* QR Header */}
      <View style={styles.qrHeader}>
        <MaterialCommunityIcons name="qrcode" size={24} color="#00104A" />
        <ThemedText type="defaultSemiBold" style={styles.qrTitle}>
          QR Token
        </ThemedText>
      </View>

      {/* QR Display Area */}
      <View style={styles.qrDisplayContainer}>
        {/* QR Code Placeholder */}
        <View style={styles.qrPlaceholder}>
          <View style={styles.qrCodeGrid}>
            {/* Top left quadrant */}
            <View style={styles.qrQuadrant}>
              <View style={styles.qrBlock} />
              <View style={styles.qrBlock} />
              <View style={styles.qrBlock} />
            </View>
            {/* Top right quadrant */}
            <View style={styles.qrQuadrant}>
              <View style={styles.qrBlock} />
              <View style={styles.qrBlock} />
              <View style={styles.qrBlock} />
            </View>
            {/* Bottom right quadrant with pattern */}
            <View style={[styles.qrQuadrant, { marginLeft: 'auto' }]}>
              <View style={[styles.qrBlock, { width: '30%', height: '30%' }]} />
              <View style={[styles.qrBlock, { width: '20%', height: '50%' }]} />
              <View style={[styles.qrBlock, { width: '50%', height: '20%' }]} />
            </View>
          </View>
        </View>

        {/* QR Token ID */}
        <ThemedText
          style={styles.qrTokenId}
          lightColor="#666"
          darkColor="#999"
        >
          {qrToken}
        </ThemedText>
      </View>

      {/* Expiration Warning */}
      <View
        style={[
          styles.expirationContainer,
          {
            backgroundColor: isExpiringSoon ? '#FEF3C7' : '#EFF6FF',
          },
        ]}
      >
        <MaterialCommunityIcons
          name="clock-outline"
          size={20}
          color={isExpiringSoon ? '#F59E0B' : '#007AFF'}
        />
        <ThemedText
          style={[
            styles.expirationText,
            {
              color: isExpiringSoon ? '#F59E0B' : '#007AFF',
            },
          ]}
          type="defaultSemiBold"
        >
          Expires in {expiresIn} mins
        </ThemedText>
      </View>

      {/* Generate New QR Button */}
      <TouchableOpacity
        onPress={handleGenerateQR}
        activeOpacity={0.7}
        style={styles.generateButton}
      >
        <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
        <ThemedText
          style={[styles.generateButtonText, { color: '#fff' }]}
          type="defaultSemiBold"
        >
          Generate New QR Code
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

/**
 * DailyCheckInsChart Component
 * Visualizes daily check-in activity with dot chart
 */
function DailyCheckInsChart() {
  // Sample data: check-ins for each day of week
  const dailyData = [
    { day: 'Mon', value: 12, max: 70 },
    { day: 'Tue', value: 28, max: 70 },
    { day: 'Wed', value: 19, max: 70 },
    { day: 'Thu', value: 35, max: 70 },
    { day: 'Fri', value: 45, max: 70 },
    { day: 'Sat', value: 55, max: 70 },
    { day: 'Sun', value: 62, max: 70 },
  ];

  const maxValue = Math.max(...dailyData.map((d) => d.max));
  const chartHeight = 140;

  return (
    <View style={styles.analyticsCard}>
      {/* Section Header */}
      <View style={styles.analyticsHeader}>
        <MaterialCommunityIcons name="chart-line" size={24} color="#00104A" />
        <ThemedText type="defaultSemiBold" style={styles.analyticsTitle}>
          Daily Check-Ins
        </ThemedText>
      </View>

      {/* Chart Area */}
      <View style={styles.chartContainer}>
        {/* Y-axis grid lines */}
        <View style={styles.chartBackground}>
          {[0, 0.25, 0.5, 0.75, 1].map((linePos, idx) => (
            <View
              key={idx}
              style={[
                styles.gridLine,
                {
                  bottom: `${linePos * 100}%`,
                },
              ]}
            />
          ))}

          {/* Data points */}
          <View style={styles.chartContent}>
            {dailyData.map((item, idx) => {
              const heightPercent = (item.value / maxValue) * 100;
              return (
                <View
                  key={idx}
                  style={[
                    styles.dataPointContainer,
                    {
                      height: chartHeight,
                    },
                  ]}
                >
                  {/* Dot at height proportional to value */}
                  <View
                    style={[
                      styles.dataDot,
                      {
                        bottom: `${heightPercent}%`,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* X-axis labels */}
        <View style={styles.xAxisLabels}>
          {dailyData.map((item, idx) => (
            <ThemedText
              key={idx}
              style={styles.xAxisLabel}
              lightColor="#999"
              darkColor="#666"
            >
              {item.day}
            </ThemedText>
          ))}
        </View>

        {/* Scale indicator */}
        <ThemedText
          style={styles.scaleLabel}
          lightColor="#999"
          darkColor="#666"
        >
          Scale: 0 - {maxValue}
        </ThemedText>
      </View>
    </View>
  );
}

/**
 * WeeklyActiveUsersChart Component
 * Visualizes weekly user activity with bar chart
 */
function WeeklyActiveUsersChart() {
  // Sample data: active users per week
  const weeklyData = [
    { week: 'Week 1', value: 120, max: 180 },
    { week: 'Week 2', value: 145, max: 180 },
    { week: 'Week 3', value: 135, max: 180 },
    { week: 'Week 4', value: 160, max: 180 },
  ];

  const maxValue = Math.max(...weeklyData.map((d) => d.max));

  return (
    <View style={styles.analyticsCard}>
      {/* Section Header */}
      <View style={styles.analyticsHeader}>
        <MaterialCommunityIcons name="account-multiple" size={24} color="#56CBF9" />
        <ThemedText type="defaultSemiBold" style={styles.analyticsTitle}>
          Weekly Active Users
        </ThemedText>
      </View>

      {/* Chart Area */}
      <View style={styles.barChartContainer}>
        {/* Bars */}
        <View style={styles.barsRow}>
          {weeklyData.map((item, idx) => {
            const heightPercent = (item.value / maxValue) * 100;
            return (
              <View key={idx} style={styles.barColumn}>
                {/* Bar container */}
                <View style={styles.barBackground}>
                  {/* Filled bar */}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${heightPercent}%`,
                      },
                    ]}
                  />
                </View>
                {/* Label */}
                <ThemedText
                  style={styles.barLabel}
                  lightColor="#999"
                  darkColor="#666"
                >
                  {item.week}
                </ThemedText>
              </View>
            );
          })}
        </View>

        {/* Scale indicator */}
        <ThemedText
          style={styles.scaleLabel}
          lightColor="#999"
          darkColor="#666"
        >
          Scale: 0 - {maxValue}
        </ThemedText>
      </View>
    </View>
  );
}

/**
 * Main InOutAnalytics Component
 */
export default function CheckInScreen() {
  const [isCheckedOut, setIsCheckedOut] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Handle check in action with confirmation
   * Shows dialog, then updates state on confirm
   */
  const handleCheckIn = () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    Alert.alert(
      'Confirm Check In',
      'Are you sure you want to check in to the library?',
      [
        {
          text: 'Cancel',
          onPress: () => setIsProcessing(false),
          style: 'cancel',
        },
        {
          text: 'Check In',
          onPress: () => {
            setIsCheckedOut(false);
            setIsProcessing(false);
            Alert.alert('Success', 'You are now checked in to the library.');
          },
        },
      ]
    );
  };

  /**
   * Handle check out action with confirmation
   * Shows dialog, then updates state on confirm
   */
  const handleCheckOut = () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    Alert.alert(
      'Confirm Check Out',
      'Are you sure you want to check out from the library?',
      [
        {
          text: 'Cancel',
          onPress: () => setIsProcessing(false),
          style: 'cancel',
        },
        {
          text: 'Check Out',
          onPress: () => {
            setIsCheckedOut(true);
            setIsProcessing(false);
            Alert.alert('Success', 'You are now checked out from the library.');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {/* Use consistent OverallHeader */}
      <OverallHeader />

      {/* Status Indicator */}
      <View style={styles.statusSection}>
        <StatusIndicator
          label={isCheckedOut ? 'Currently Checked Out' : 'Currently Checked In'}
          isActive={isCheckedOut}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Action Buttons Section */}
        <View style={styles.section}>
          <View style={styles.actionButtonsContainer}>
            <ActionButton
              icon="login"
              label="Check In"
              onPress={handleCheckIn}
              variant="primary"
              isDisabled={!isCheckedOut || isProcessing}
            />
            <ActionButton
              icon="logout"
              label="Check Out"
              onPress={handleCheckOut}
              variant="danger"
              isDisabled={isCheckedOut || isProcessing}
            />
          </View>
        </View>

        {/* QR Token Card Section */}
        <View style={styles.section}>
          <QRCard />
        </View>

        {/* Daily Check-Ins Chart */}
        <View style={styles.section}>
          <DailyCheckInsChart />
        </View>

        {/* Weekly Active Users Chart */}
        <View style={styles.section}>
          <WeeklyActiveUsersChart />
        </View>

        {/* Bottom spacing for navigation */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky Navigation */}
      <Navigation activeTab="inout" />
    </View>
  );
}

/**
 * StyleSheet Definitions
 * 
 * Mobile-first responsive design with:
 * - Soft shadows for depth
 * - Rounded corners for modern look
 * - Color-coded sections for visual hierarchy
 * - Adequate spacing and padding
 * - Touch-friendly component sizes
 * - Fixed navigation for easy access
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  /* Status Indicator */
  statusSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },

  /* Section Layout */
  section: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },

  /* Action Buttons */
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },

  /* QR Card */
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  qrDisplayContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  qrPlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  qrCodeGrid: {
    width: 120,
    height: 120,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  qrQuadrant: {
    width: '48%',
    height: '48%',
    backgroundColor: 'transparent',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  qrBlock: {
    width: '35%',
    height: '35%',
    backgroundColor: '#00104A',
    borderRadius: 2,
  },
  qrTokenId: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
  },
  expirationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  expirationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: '#00104A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    shadowColor: '#00104A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* Analytics Cards */
  analyticsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },

  /* Daily Check-Ins Chart */
  chartContainer: {
    gap: 12,
  },
  chartBackground: {
    height: 140,
    position: 'relative',
    marginBottom: 8,
  },
  gridLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#e5e5e5',
  },
  chartContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    paddingHorizontal: 0,
  },
  dataPointContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dataDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00104A',
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  xAxisLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  scaleLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },

  /* Weekly Active Users Bar Chart */
  barChartContainer: {
    gap: 16,
    marginTop: 30,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barBackground: {
    width: 40,
    height: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: '#56CBF9',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
