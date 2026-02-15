import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from "expo-status-bar";
import React, { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View, Linking, Text } from 'react-native';
import OverallHeader from "../AllHeader/OverallHeader";
import Navigation from '../Library Visitor/Navigation';
import Footer from './Footer';

const { width } = Dimensions.get('window');

// --- Mock Data ---

const ANNOUNCEMENTS = [
  {
    id: 1,
    title: "#ValACEWeekends: Viking this afternoon",
    desc: "Join us at the 3rd Floor eLab for a special workshop.",
    date: "10 mins ago",
    type: "Announcement"
  }
];

const EVENTS_DB: Record<string, { time: string; title: string; desc: string }[]> = {
  // Key format: YYYY-MM-DD
  '2026-10-18': [
    { time: '09:00 AM', title: 'Event 1', desc: 'Details...' },
    { time: '02:00 PM', title: 'Event 2', desc: 'Details...' },
  ],
};

const SERVICES = [
  { id: 1, icon: 'monitor', label: 'Public Computers + Free wifi', desc: 'Access high-speed internet and workstations.' },
  { id: 2, icon: 'book-open-page-variant', label: 'Study Rooms', desc: 'Quiet spaces for focus and collaboration.' },
  { id: 3, icon: 'laptop', label: 'Computers', desc: 'Laptop lending program available.' },
];

const BRANCHES = [
  { id: 1, name: 'Valace Malinta', address: 'McArthur Highway, Malinta', status: 'High Traffic', distance: '1.2 km', image: 'https://via.placeholder.com/50' },
  { id: 2, name: 'Valace Marulas', address: 'Marulas, Valenzuela', status: 'Open', distance: '4.5 km', image: 'https://via.placeholder.com/50' },
  { id: 3, name: 'Valace Gen. T. De Leon', address: 'Gen. T. De Leon', status: 'Open', distance: '12.5 km', image: 'https://via.placeholder.com/50' },
  { id: 4, name: 'Valace Mapulang Lupa', address: 'Mapulang Lupa', status: 'Open', distance: '12.5 km', image: 'https://via.placeholder.com/50' }
];

// --- Helper Functions for Calendar ---

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// --- Components ---

function AnnouncementCard() {
  const latest = ANNOUNCEMENTS[0];
  if (!latest) {
    return (
      <View style={styles.announcementCard}>
        <ThemedText style={styles.noDataText}>No announcements available.</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.announcementCard}>
      <View style={styles.announcementHeader}>
        <View style={styles.announcementTag}>
          <ThemedText style={styles.announcementTagText}>{latest.type}</ThemedText>
        </View>
        <ThemedText style={styles.announcementTime}>{latest.date}</ThemedText>
      </View>
      <ThemedText type="defaultSemiBold" style={styles.announcementTitle}>{latest.title}</ThemedText>
      <ThemedText style={styles.announcementDesc} numberOfLines={2}>{latest.desc}</ThemedText>
    </View>
  );
}

function CalendarSection() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 18)); // Start Oct 2026 based on image
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 9, 18));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const daysArray = [];
  // Fill empty slots
  for (let i = 0; i < firstDay; i++) {
    daysArray.push(null);
  }
  // Fill days
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(new Date(year, month, i));
  }

  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const isSelected = (date: Date) => {
    return date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  // Format selected date for events lookup: YYYY-MM-DD
  const formattedSelectedDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const dailyEvents = EVENTS_DB[formattedSelectedDate] || [];

  return (
    <View style={styles.sectionMarginTop}>
      <ThemedText type="title" style={styles.sectionTitle}>Calendar of Activities</ThemedText>
      <ThemedText style={styles.sectionSubtitle}>Check upcoming activities</ThemedText>

      {/* Calendar Card */}
      <View style={styles.calendarCard}>
        {/* Opening Hours Header */}
        <View style={styles.openingHoursContainer}>
          <View style={styles.ohHeader}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
            <ThemedText style={styles.ohLabel}> OPENING HOURS</ThemedText>
            <View style={styles.openNowBadge}>
              <ThemedText style={styles.openNowText}>● Open Now</ThemedText>
            </View>
          </View>
          <View style={styles.ohRow}>
            <View>
              <ThemedText style={styles.ohDayType}>Weekday</ThemedText>
              <ThemedText style={styles.ohTime}>08:00 AM - 05:00 PM</ThemedText>
            </View>
            <View>
              <ThemedText style={styles.ohDayType}>Weekend</ThemedText>
              <ThemedText style={styles.ohTime}>10:00 AM - 04:00 PM</ThemedText>
            </View>
          </View>
        </View>

        {/* Month Selector */}
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => changeMonth('prev')} style={styles.arrowBtn}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.monthLabelContainer}>
            <ThemedText type="defaultSemiBold" style={styles.monthLabel}>
              {MONTH_NAMES[month]}
            </ThemedText>
            <ThemedText style={styles.yearLabel}> - {year}</ThemedText>
          </View>
          <TouchableOpacity onPress={() => changeMonth('next')} style={styles.arrowBtn}>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Days Header */}
        <View style={styles.daysHeader}>
          {DAYS_OF_WEEK.map((d, i) => (
            <ThemedText key={i} style={styles.dayHeaderLabel}>{d}</ThemedText>
          ))}
        </View>

        {/* Days Grid */}
        <View style={styles.daysGrid}>
          {daysArray.map((date, index) => {
            if (!date) return <View key={index} style={styles.dayCell} />;

            const selected = isSelected(date);
            return (
              <TouchableOpacity key={index} style={styles.dayCell} onPress={() => setSelectedDate(date)}>
                <View style={[styles.dayCircle, selected && styles.dayCircleSelected]}>
                  <ThemedText style={[styles.dayText, selected && styles.dayTextSelected]}>
                    {date.getDate()}
                  </ThemedText>
                  {/* Optional dot for event existence? */}
                  {date.getDate() === 18 && ( // Mock event indicator
                    <View style={[styles.eventDot, selected && { backgroundColor: '#fff' }]} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Daily Events Section */}
      <View style={styles.eventsSection}>
        <View style={styles.eventsHeader}>
          <ThemedText type="defaultSemiBold">Events for {MONTH_NAMES[selectedDate.getMonth()].substring(0, 3)} {selectedDate.getDate()}</ThemedText>
          <ThemedText style={styles.eventCount}>{dailyEvents.length} activities</ThemedText>
        </View>

        {dailyEvents.length > 0 ? (
          dailyEvents.map((evt, idx) => (
            <View key={idx} style={styles.eventCard}>
              <View style={styles.eventTimeBar} />
              <View style={styles.eventContent}>
                <ThemedText style={styles.eventTime}>{evt.time}</ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.eventTitle}>{evt.title}</ThemedText>
                <ThemedText style={styles.eventDesc}>{evt.desc}</ThemedText>
              </View>
            </View>
          ))
        ) : (
          <ThemedText style={styles.noEventsText}>No events scheduled for this date.</ThemedText>
        )}
      </View>
    </View>
  );
}

function ServicesSection() {
  return (
    <View style={styles.sectionContainer}>
      <ThemedText type="title" style={styles.sectionTitle}>Our Services</ThemedText>
      <ThemedText style={styles.sectionSubtitle}>Specialized solutions for your asset</ThemedText>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesScroll}>
        {SERVICES.map((service) => (
          <View key={service.id} style={styles.serviceCard}>
            <View style={styles.serviceIconContainer}>
              <MaterialCommunityIcons name={service.icon as any} size={28} color="#5B67CA" />
            </View>
            <View style={styles.serviceTag}>
              <ThemedText style={styles.serviceTagText}>Feature</ThemedText>
            </View>
            <ThemedText type="defaultSemiBold" style={styles.serviceLabel}>{service.label}</ThemedText>
            <ThemedText style={styles.serviceDesc}>{service.desc}</ThemedText>

            <View style={styles.serviceFooter}>
              <ThemedText style={styles.learnMore}>LEARN MORE</ThemedText>
              <MaterialCommunityIcons name="arrow-right" size={16} color="#5B67CA" />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function BranchesSection() {
  return (
    // FIX: Removed `sectionContainer` to avoid double padding. Using simple vertical margin.
    <View style={styles.sectionMarginTop}>
      <View style={styles.sectionHeaderStack}>
        <ThemedText type="title" style={styles.sectionTitle}>Current Branches</ThemedText>
        <ThemedText style={styles.sectionSubtitle}>Find the nearest Val-Track center</ThemedText>
      </View>

      <View style={styles.branchesCardContainer}>
        {BRANCHES.map((branch, index) => (
          <TouchableOpacity key={branch.id} style={[styles.branchRow, index < BRANCHES.length - 1 && styles.branchDivider]} activeOpacity={0.7}>
            <View style={styles.branchImgPlaceholder}>
              <MaterialCommunityIcons name="office-building" size={24} color="#555" />
            </View>

            <View style={styles.branchInfo}>
              <Text style={styles.branchName}>{branch.name}</Text>
              <Text style={styles.branchAddress}>{branch.address}</Text>
              <View style={[styles.statusBadge, branch.status === 'Open' ? styles.statusOpen : styles.statusTraffic]}>
                <Text style={[styles.statusText, branch.status === 'Open' ? {} : { color: '#C02626' }]}>{branch.status}</Text>
              </View>
            </View>

            <View style={styles.branchMeta}>
              <Text style={styles.distText}>{branch.distance}</Text>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color="#5B67CA" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ContactSection() {
  const handleCall = () => {
    Linking.openURL('tel:283521000').catch(err => console.error("Couldn't open dialer", err));
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@valtrack.com').catch(err => console.error("Couldn't open email", err));
  };

  return (
    // FIX: Removed `sectionContainer` to avoid double padding
    <View style={styles.sectionMarginTop}>
      <ThemedText type="title" style={styles.sectionTitle}>Get in Touch</ThemedText>

      <View style={styles.contactRow}>
        <TouchableOpacity style={styles.contactCard} onPress={handleCall} activeOpacity={0.7}>
          <MaterialCommunityIcons name="phone" size={24} color="#5B67CA" />
          <Text style={styles.contactTitle}>Call Hotline</Text>
          <Text style={styles.contactSub}>283521000</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactCard} onPress={handleEmail} activeOpacity={0.7}>
          <MaterialCommunityIcons name="email-outline" size={24} color="#5B67CA" />
          <Text style={styles.contactTitle}>Email Us</Text>
          <Text style={styles.contactSub} numberOfLines={1}>support@valtrack.com</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function Dashboard() {
  const router = useRouter(); // FIX: Initialize router
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {/* OverallHeader with Menu Action */}
      <OverallHeader
        onMenuPress={() => setIsDrawerOpen(true)}
        onNotificationPress={() => router.push('/Patron/Home/Notification')}
        notificationCount={2} // Mock count for demo
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Customized Greeting */}
        <View style={styles.greetingContainer}>
          <ThemedText type="title">Hello, Alex</ThemedText>
          <ThemedText style={styles.greetingSub}>Welcome to Val-Track App</ThemedText>
        </View>

        <AnnouncementCard />
        <CalendarSection />
        <ServicesSection />
        <BranchesSection />
        <ContactSection />
        <Footer />

        {/* Bottom spacer for nav bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Navigation Drawer (Overlay) */}
      <Navigation
        activeTab="dashboard"
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 10,
  },
  greetingContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  greetingSub: {
    color: '#00104A',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 4,
    marginLeft: 20,
    color: '#00104A',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#00104A',
    marginBottom: 15,
    marginLeft: 20,
  },
  // Used for Services only (includes horizontal padding)
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  // Used for sections where internal cards handle margins (Branches, Contact)
  sectionMarginTop: {
    marginTop: 25,
  },

  // Announcement
  announcementCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFF0F3', // Light pinkish/red bg
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  announcementTag: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  announcementTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  announcementTime: {
    fontSize: 12,
    color: '#888',
  },
  announcementTitle: {
    fontSize: 15,
    marginBottom: 4,
    color: '#333',
  },
  announcementDesc: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  noDataText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center'
  },

  // Calendar
  calendarCard: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#eee',
  },
  openingHoursContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },
  ohHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ohLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    flex: 1,
    marginLeft: 4,
  },
  openNowBadge: {
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  openNowText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: 'bold',
  },
  ohRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ohDayType: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  ohTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    paddingVertical: 5,
  },
  arrowBtn: {
    padding: 10,
  },
  monthLabelContainer: {
    flexDirection: 'row',
  },
  monthLabel: {
    fontSize: 16,
    color: '#333',
  },
  yearLabel: {
    fontSize: 16,
    color: '#666',
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  dayHeaderLabel: {
    width: (width - 80) / 7,
    textAlign: 'center',
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: (width - 80) / 7, // aligned with header
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleSelected: {
    backgroundColor: '#5B67CA',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#5B67CA',
    position: 'absolute',
    bottom: 4,
  },

  // Events List
  eventsSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventCount: {
    fontSize: 12,
    color: '#888',
  },
  noEventsText: {
    color: '#999',
    fontStyle: 'italic',
    marginTop: 10,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
  },
  eventTimeBar: {
    width: 4,
    backgroundColor: '#00104A',
    borderRadius: 2,
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 15,
    color: '#000',
    marginBottom: 2,
  },
  eventDesc: {
    fontSize: 12,
    color: '#666',
  },

  // Services
  servicesScroll: {
    paddingRight: 20,
    gap: 12,
  },
  serviceCard: {
    width: width * 0.6,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#eee',
  },
  serviceIconContainer: {
    backgroundColor: '#EEF0FF',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceTag: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  serviceTagText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  serviceLabel: {
    fontSize: 16,
    marginBottom: 6,
    color: '#333',
  },
  serviceDesc: {
    fontSize: 12,
    color: '#888',
    marginBottom: 15,
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  learnMore: {
    color: '#5B67CA',
    fontSize: 12,
    fontWeight: '700',
  },

  // Branches
  sectionHeaderStack: {
    marginBottom: 10,
  },
  branchesCardContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 0,
    paddingVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#eee',
    marginHorizontal: 20, // This is the single source of margin for Branches
  },
  branchesList: {
    gap: 0,
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  branchDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  branchImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  branchImgPlaceholder: {
    width: 44,
    height: 44,
    backgroundColor: '#f0f0f0',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  branchInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  branchName: {
    fontSize: 14,
    marginBottom: 2,
    color: '#333',
  },
  branchAddress: {
    fontSize: 11,
    color: '#888',
    marginBottom: 5,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusOpen: {
    backgroundColor: '#F3F4F6',
  },
  statusTraffic: {
    backgroundColor: '#FFF0F3',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
  },
  branchMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    // Removed height: '100%' to fix visibility glitch
    marginLeft: 10,
  },
  distText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },

  // Contact
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
    paddingHorizontal: 20, // Single source of padding for Contact
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  contactTitle: {
    marginTop: 12,
    fontSize: 14,
    marginBottom: 2,
    color: '#333',
  },
  contactSub: {
    fontSize: 11,
    color: '#888',
  },
});