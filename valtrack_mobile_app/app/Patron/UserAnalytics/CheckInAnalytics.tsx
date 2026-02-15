import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import OverallHeader from "../AllHeader/OverallHeader";
import Navigation from '../Library Visitor/Navigation';
import Footer from '../Home/Footer';

const { width } = Dimensions.get('window');

type TimeFilter = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

// --- Mock Data ---

const ANALYTICS_DATA = {
  Daily: {
    totalVisits: 3,
    comparison: "1 more than yesterday",
    percent: "+50%",
    chartData: [
      { label: '8AM', value: 0 }, { label: '10AM', value: 1 },
      { label: '12PM', value: 2 }, { label: '2PM', value: 0 },
      { label: '4PM', value: 0 }, { label: '6PM', value: 0 }
    ],
    highlight: "Peak hour was 12PM",
    avgDuration: "35m"
  },
  Weekly: {
    totalVisits: 24,
    comparison: "7 more than last week",
    percent: "+12.5%",
    chartData: [
      { label: 'Mon', value: 15 }, { label: 'Tue', value: 20 },
      { label: 'Wed', value: 12 }, { label: 'Thu', value: 25 },
      { label: 'Fri', value: 28 }, { label: 'Sat', value: 18 },
      { label: 'Sun', value: 10 }
    ],
    highlight: "Peak hours are between 2PM - 5PM",
    avgDuration: "42m"
  },
  Monthly: {
    totalVisits: 96,
    comparison: "12 more than last month",
    percent: "+8.3%",
    chartData: [
      { label: 'Wk1', value: 20 }, { label: 'Wk2', value: 28 },
      { label: 'Wk3', value: 22 }, { label: 'Wk4', value: 26 }
    ],
    highlight: "Most active week was Week 2",
    avgDuration: "45m"
  },
  Yearly: {
    totalVisits: 1150,
    comparison: "120 more than last year",
    percent: "+11.6%",
    chartData: [
      { label: 'Jan', value: 80 }, { label: 'Mar', value: 95 },
      { label: 'May', value: 110 }, { label: 'Jul', value: 100 },
      { label: 'Sep', value: 120 }, { label: 'Nov', value: 130 }
    ],
    highlight: "Busiest month was November",
    avgDuration: "40m"
  }
};

export default function CheckInAnalytics() {
  const [selectedFilter, setSelectedFilter] = useState<TimeFilter>('Weekly');
  const [data, setData] = useState(ANALYTICS_DATA['Weekly']);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    setData(ANALYTICS_DATA[selectedFilter]);
  }, [selectedFilter]);

  const maxChartValue = Math.max(...data.chartData.map(d => d.value));

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <OverallHeader onMenuPress={() => setIsDrawerOpen(true)} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Title */}
        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>Analytics</Text>
          <View style={styles.subtitleRow}>
            <MaterialCommunityIcons name="calendar-month-outline" size={16} color="#666" />
            <Text style={styles.pageSubtitle}> Your Library Visit Activity</Text>
          </View>
        </View>

        {/* Time Filters */}
        <View style={styles.filterContainer}>
          {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as TimeFilter[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterTab, selectedFilter === filter && styles.filterTabActive]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[styles.filterText, selectedFilter === filter && styles.filterTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Total Visits Card */}
        <View style={styles.card}>
          <View style={styles.visitsHeader}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name="account-group" size={24} color="#10B981" />
            </View>
            <View style={styles.percentBadge}>
              <Text style={styles.percentText}>{data.percent}</Text>
            </View>
          </View>

          <Text style={styles.cardLabel}>Total Visits</Text>
          <Text style={styles.bigValue}>{data.totalVisits}</Text>

          <View style={styles.trendRow}>
            <MaterialCommunityIcons name="trending-up" size={16} color="#10B981" />
            <Text style={styles.trendText}> {data.comparison}</Text>
          </View>
        </View>

        {/* Visit Frequency Chart */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Visit Frequency</Text>
              <Text style={styles.cardSubtitle}>{data.highlight}</Text>
            </View>
            <MaterialCommunityIcons name="information-outline" size={20} color="#ccc" />
          </View>

          <View style={styles.chartContainer}>
            <View style={styles.yAxis}>
              <Text style={styles.axisText}>{Math.round(maxChartValue * 1.2)}</Text>
              <View style={{ flex: 1 }} />
              <Text style={styles.axisText}>0</Text>
            </View>

            <View style={styles.chartBarsArea}>
              {/* Grid Lines */}
              <View style={styles.gridLineTop} />
              <View style={styles.gridLineMid} />
              <View style={styles.gridLineBottom} />

              {/* Bars */}
              <View style={styles.barsRow}>
                {data.chartData.map((d, i) => {
                  const barHeight = (d.value / (maxChartValue * 1.2)) * 100;
                  return (
                    <View key={i} style={styles.barWrapper}>
                      <View style={[styles.bar, { height: `${barHeight}%` }]} />
                      <Text style={styles.barLabel}>{d.label}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>Library Visits</Text>
          </View>
        </View>

        {/* Insights */}
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>INSIGHTS</Text>

          <View style={styles.card}>
            <Text style={styles.insightLabel}>AVG. DURATION</Text>
            <Text style={styles.bigValue}>{data.avgDuration}</Text>

            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '40%' }]} />
            </View>
          </View>
        </View>

        <Footer />

        {/* Spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Navigation
        activeTab="analytics"
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // White background
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // Header Section
  headerSection: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00104A',
    marginBottom: 4,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#888',
  },

  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#333',
    fontWeight: '600',
  },

  // Cards
  card: {
    backgroundColor: '#fff', // Or check design for specific color. Image shows light green for one card?
    // Let's make Total Visits card light green as per image description "Light Green" logic
    // But the general card class is for white cards. Special case for Total Visits
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },

  // Total Visits Specific (If needed to override)
  // Actually, let's style the Total Visits card specifically if it needs a background
  // The image shows Total Visits has a light green background.
  // I will assume the first card (Total Visits) might get a style override or inner container.

  visitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#D1FAE5', // Light green
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 12,
  },
  cardLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  bigValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00104A',
    marginBottom: 8,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
  },

  // Chart
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 200,
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: 10,
    paddingVertical: 10,
  },
  axisText: {
    fontSize: 10,
    color: '#ccc',
  },
  chartBarsArea: {
    flex: 1,
    position: 'relative',
  },
  gridLineTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
    borderStyle: 'dashed',
  },
  gridLineMid: {
    position: 'absolute',
    top: '50%', left: 0, right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
    borderStyle: 'dashed',
  },
  gridLineBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 12, // Slender bars
    backgroundColor: '#00104A',
    borderRadius: 6,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 10,
    color: '#888',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00104A',
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },

  // Insights
  insightsSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 10,
    letterSpacing: 1,
  },
  insightLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '700',
    marginBottom: 6,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFD700', // Gold/Yellowish for duration
    borderRadius: 3,
  }
});
