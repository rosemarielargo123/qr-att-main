
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

const C = {
  background: '#FFF5F8',
  white: '#FFFFFF',
  pink: '#F5A9C8',
  pinkDark: '#CE5F8D',
  pinkDeep: '#AD4775',
  lightPink: '#FFE4EE',
  softPink: '#FFF0F5',
  border: '#F6D0DE',
  text: '#613E51',
  muted: '#A77D91',
  lavender: '#EDE5FF',
  lavenderDark: '#9172C9',
  green: '#4E9A7B',
};

type UpcomingEvent = {
  id: string;
  title: string;
  start: string | null;
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fullName, setFullName] = useState('Student');
  const [role, setRole] = useState('student');
  const [upcomingEvents, setUpcomingEvents] =
    useState<UpcomingEvent[]>([]);

  const loadHome = useCallback(async () => {
    try {
      if (!user) {
        setFullName('Guest');
        setRole('student');
        setUpcomingEvents([]);
        return;
      }

      const [profileResult, eventsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .maybeSingle(),

        // Read available event columns to avoid assuming
        // that a particular date column exists.
        supabase.from('events').select('*').limit(50),
      ]);

      if (profileResult.error) {
        console.warn('Profile error:', profileResult.error.message);
      }

      setFullName(
        profileResult.data?.full_name ||
          user.email?.split('@')[0] ||
          'User'
      );

      setRole(profileResult.data?.role || 'student');

      if (eventsResult.error) {
        console.warn('Events error:', eventsResult.error.message);
        setUpcomingEvents([]);
      } else {
        const rows = eventsResult.data ?? [];

        const mapped: UpcomingEvent[] = rows.map(
          (event: Record<string, unknown>, index: number) => {
            const rawDate =
              event.start ??
              event.start_date ??
              event.event_date ??
              event.date ??
              null;

            return {
              id: String(
                event.id ?? event.eventId ?? `event-${index}`
              ),
              title: String(
                event.title ??
                  event.event_title ??
                  event.name ??
                  'Untitled Event'
              ),
              start: rawDate ? String(rawDate) : null,
            };
          }
        );

        const now = Date.now();

        setUpcomingEvents(
          mapped.filter((event) => {
            if (!event.start) return true;

            const timestamp = new Date(event.start).getTime();

            return (
              Number.isNaN(timestamp) ||
              timestamp >= now
            );
          })
        );
      }
    } catch (error) {
      console.warn('Dashboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadHome();
    }, [loadHome])
  );

  const refresh = async () => {
    setRefreshing(true);
    await loadHome();
  };

  const greeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />
        <View style={styles.loadingIcon}>
          <Ionicons name="heart" size={30} color={C.pinkDark} />
        </View>
        <ActivityIndicator
          size="large"
          color={C.pinkDark}
          style={{ marginTop: 18 }}
        />
        <Text style={styles.loadingTitle}>Getting things ready...</Text>
        <Text style={styles.muted}>Your attendance space</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={C.pinkDark}
            colors={[C.pinkDark]}
          />
        }
      >
        {/* Header */}
        <View style={styles.topBar}>
          <View style={styles.brandIcon}>
            <Ionicons
              name="qr-code-outline"
              size={27}
              color={C.pinkDark}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>QR Attendance</Text>
            <Text style={styles.brandSubtitle}>
              Your campus, your attendance
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.pressed,
            ]}
            onPress={refresh}
            accessibilityRole="button"
            accessibilityLabel="Refresh dashboard"
          >
            <Ionicons
              name="refresh-outline"
              size={22}
              color={C.pinkDark}
            />
          </Pressable>
        </View>

        {/* Welcome card */}
        <View style={styles.welcomeCard}>
          <View style={styles.decorCircleOne} />
          <View style={styles.decorCircleTwo} />

          <View style={styles.welcomeContent}>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>{greeting()}!</Text>
              <Text style={styles.wave}>🌸</Text>
            </View>

            <Text style={styles.welcomeCaption}>
              Welcome back,
            </Text>

            <Text style={styles.name} numberOfLines={2}>
              {fullName}
            </Text>

            <View style={styles.roleBadge}>
              <Ionicons
                name="person-circle-outline"
                size={15}
                color={C.pinkDeep}
              />
              <Text style={styles.roleText}>{role}</Text>
            </View>
          </View>

          <View style={styles.welcomeIllustration}>
            <View style={styles.heartCircle}>
              <Ionicons name="heart" size={35} color={C.pinkDark} />
            </View>
            <View style={styles.sparkleOne}>
              <Ionicons name="sparkles" size={17} color={C.pinkDeep} />
            </View>
            <View style={styles.sparkleTwo}>
              <Ionicons name="heart" size={13} color={C.pink} />
            </View>
          </View>
        </View>

        {/* Quick action heading */}
        <View style={styles.headingBlock}>
          <View>
            <Text style={styles.sectionTitle}>Ready to check in?</Text>
            <Text style={styles.sectionSubtitle}>
              Your next activity is just a scan away.
            </Text>
          </View>

          <View style={styles.headingIcon}>
            <Ionicons
              name="scan-outline"
              size={22}
              color={C.pinkDark}
            />
          </View>
        </View>

        {/* QR scanner card */}
        <Pressable
          style={({ pressed }) => [
            styles.scanButton,
            pressed && styles.scanPressed,
          ]}
          onPress={() => router.push('/scan')}
          accessibilityRole="button"
        >
          <View style={styles.scanDecorOne} />
          <View style={styles.scanDecorTwo} />

          <View style={styles.scanIconBox}>
            <Ionicons
              name="qr-code"
              size={35}
              color={C.pinkDeep}
            />
          </View>

          <View style={styles.scanContent}>
            <View style={styles.scanLabel}>
              <View style={styles.activeDot} />
              <Text style={styles.scanLabelText}>QUICK ACTION</Text>
            </View>

            <Text style={styles.scanTitle}>Scan QR Code</Text>

            <Text style={styles.scanSubtitle}>
              Scan your event QR to record your attendance.
            </Text>

            <View style={styles.scanCta}>
              <Text style={styles.scanCtaText}>Start scanning</Text>
              <Ionicons
                name="arrow-forward-circle"
                size={21}
                color={C.pinkDeep}
              />
            </View>
          </View>
        </Pressable>

        {/* Upcoming events */}
        <View style={styles.eventsHeading}>
          <View style={styles.eventsTitleRow}>
            <View style={styles.calendarHeadingIcon}>
              <Ionicons
                name="calendar"
                size={21}
                color={C.pinkDark}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Upcoming Events</Text>
              <Text style={styles.sectionSubtitle}>
                Stay ready for your next activity.
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {upcomingEvents.length}
              </Text>
            </View>
          </View>
        </View>

        {upcomingEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyDecor} />

            <View style={styles.emptyIllustration}>
              <Ionicons
                name="calendar-clear-outline"
                size={31}
                color={C.pinkDark}
              />
              <View style={styles.emptyMiniHeart}>
                <Ionicons
                  name="heart"
                  size={12}
                  color={C.pinkDark}
                />
              </View>
            </View>

            <Text style={styles.emptyTitle}>
              Nothing scheduled yet
            </Text>

            <Text style={styles.emptySubtitle}>
              Your upcoming events will show up here.
            </Text>

            <View style={styles.emptyHint}>
              <Ionicons
                name="notifications-outline"
                size={15}
                color={C.pinkDark}
              />
              <Text style={styles.emptyHintText}>
                Check back for new activities
              </Text>
            </View>
          </View>
        ) : (
          upcomingEvents.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventDateIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color={C.pinkDark}
                />
              </View>

              <View style={styles.eventDetails}>
                <Text style={styles.eventTitle}>
                  {event.title}
                </Text>

                <View style={styles.eventDateRow}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={C.muted}
                  />
                  <Text style={styles.eventDateText}>
                    {event.start
                      ? formatDate(event.start)
                      : 'Date not set'}
                  </Text>
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={C.pinkDark}
              />
            </View>
          ))
        )}

        {/* Small encouragement card */}
        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons
              name="heart-outline"
              size={22}
              color={C.pinkDark}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>A little reminder</Text>
            <Text style={styles.tipText}>
              Be on time, stay prepared, and make every class count.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date not set';
  }

  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIcon: {
    width: 70,
    height: 70,
    borderRadius: 25,
    backgroundColor: C.lightPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 18,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 30,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 23,
  },
  brandIcon: {
    width: 49,
    height: 49,
    borderRadius: 17,
    backgroundColor: C.lightPink,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: C.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    color: C.muted,
    fontSize: 11,
    marginTop: 4,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  pressed: {
    opacity: 0.7,
  },
  welcomeCard: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FADCE8',
    borderRadius: 27,
    borderWidth: 1,
    borderColor: '#F4C5D8',
    padding: 21,
    minHeight: 178,
    marginBottom: 28,
  },
  welcomeContent: {
    flex: 1,
    zIndex: 2,
  },
  decorCircleOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.30)',
    right: -40,
    top: -65,
  },
  decorCircleTwo: {
    position: 'absolute',
    width: 115,
    height: 115,
    borderRadius: 58,
    backgroundColor: 'rgba(255,255,255,0.25)',
    right: 30,
    bottom: -75,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greeting: {
    color: C.pinkDeep,
    fontSize: 15,
    fontWeight: '800',
  },
  wave: {
    fontSize: 15,
  },
  welcomeCaption: {
    color: C.muted,
    fontSize: 12,
    marginTop: 13,
  },
  name: {
    color: C.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 3,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 13,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
  },
  roleText: {
    color: C.pinkDeep,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  welcomeIllustration: {
    width: 88,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
  },
  heartCircle: {
    width: 68,
    height: 68,
    borderRadius: 25,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-7deg' }],
    elevation: 3,
    shadowColor: C.pinkDeep,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  sparkleOne: {
    position: 'absolute',
    right: 0,
    top: 7,
  },
  sparkleTwo: {
    position: 'absolute',
    left: 0,
    bottom: 7,
  },
  headingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 10,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  sectionSubtitle: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  headingIcon: {
    width: 45,
    height: 45,
    borderRadius: 16,
    backgroundColor: C.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButton: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 17,
    backgroundColor: '#FBE1EB',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1C1D4',
    marginBottom: 30,
  },
  scanPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  scanDecorOne: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.40)',
    right: -45,
    top: -65,
  },
  scanDecorTwo: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.30)',
    right: 30,
    bottom: -55,
  },
  scanIconBox: {
    width: 57,
    height: 57,
    borderRadius: 19,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F6D0DE',
  },
  scanContent: {
    flex: 1,
    zIndex: 1,
  },
  scanLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 7,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.pinkDark,
  },
  scanLabelText: {
    color: C.pinkDeep,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  scanTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: '900',
  },
  scanSubtitle: {
    color: '#8E6578',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },
  scanCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    backgroundColor: C.white,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginTop: 14,
  },
  scanCtaText: {
    color: C.pinkDeep,
    fontSize: 11,
    fontWeight: '900',
  },
  eventsHeading: {
    marginBottom: 15,
  },
  eventsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  calendarHeadingIcon: {
    width: 45,
    height: 45,
    borderRadius: 16,
    backgroundColor: C.lightPink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  countBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countText: {
    color: C.pinkDeep,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: C.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  emptyDecor: {
    position: 'absolute',
    width: 145,
    height: 145,
    borderRadius: 73,
    backgroundColor: C.softPink,
    top: -90,
    right: -40,
  },
  emptyIllustration: {
    position: 'relative',
    width: 65,
    height: 65,
    borderRadius: 23,
    backgroundColor: C.lightPink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyMiniHeart: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 24,
    height: 24,
    borderRadius: 9,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: C.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 7,
  },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.softPink,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginTop: 17,
  },
  emptyHintText: {
    color: C.pinkDeep,
    fontSize: 10,
    fontWeight: '700',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: C.border,
    padding: 15,
    marginBottom: 11,
    elevation: 1,
    shadowColor: C.pinkDeep,
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },
  eventDateIcon: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: C.lightPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: '800',
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
  },
  eventDateText: {
    color: C.muted,
    fontSize: 11,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.lavender,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DFD3FA',
    padding: 15,
    marginTop: 22,
  },
  tipIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: '900',
  },
  tipText: {
    color: '#817098',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  muted: {
    color: C.muted,
    fontSize: 12,
    marginTop: 4,
  },
});
