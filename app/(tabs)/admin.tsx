import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type Section = 'overview' | 'users' | 'events' | 'attendance';
type DataRow = Record<string, any>;

type DashboardData = {
  users: DataRow[];
  events: DataRow[];
  attendance: DataRow[];
  userCount: number;
  eventCount: number;
  attendanceCount: number;
};

const EMPTY_DATA: DashboardData = {
  users: [],
  events: [],
  attendance: [],
  userCount: 0,
  eventCount: 0,
  attendanceCount: 0,
};

const TABS: {
  key: Section;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'overview', label: 'Overview', icon: 'grid-outline' },
  { key: 'users', label: 'Users', icon: 'people-outline' },
  { key: 'events', label: 'Events', icon: 'calendar-outline' },
  { key: 'attendance', label: 'Attendance', icon: 'checkmark-done-outline' },
];

const getName = (item: DataRow) =>
  item.full_name ||
  item.name ||
  item.title ||
  item.eventTitle ||
  item.event_title ||
  item.email ||
  'Unnamed';

const getEventTitle = (item: DataRow) =>
  item.title ||
  item.event_title ||
  item.eventTitle ||
  item.name ||
  'Untitled event';

const getDate = (value: unknown) => {
  if (!value) return 'Date unavailable';

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getTime = (item: DataRow) =>
  item.scanned_at ||
  item.scannedAt ||
  item.created_at ||
  item.createdAt ||
  item.start ||
  item.start_date ||
  item.event_date ||
  item.date ||
  null;

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'AD';

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [section, setSection] = useState<Section>('overview');
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [accessState, setAccessState] = useState<
    'checking' | 'admin' | 'denied' | 'error'
  >('checking');

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      if (!user?.id) {
        setData(EMPTY_DATA);
        setAccessState('error');
        setErrorMessage('Please sign in to access the Admin Dashboard.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage('');
      let verifiedAdmin = false;

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profile || String(profile.role).toLowerCase() !== 'admin') {
          setAccessState('denied');
          setData(EMPTY_DATA);
          return;
        }

        verifiedAdmin = true;
        setAccessState('admin');

        const [
          usersResult,
          eventsResult,
          attendanceResult,
          userCountResult,
          eventCountResult,
          attendanceCountResult,
        ] = await Promise.all([
          supabase.from('profiles').select('*').limit(100),
          supabase.from('events').select('*').limit(100),
          supabase.from('attendance').select('*').limit(100),
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('events')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true }),
        ]);

        const queryError =
          usersResult.error ||
          eventsResult.error ||
          attendanceResult.error ||
          userCountResult.error ||
          eventCountResult.error ||
          attendanceCountResult.error;

        if (queryError) throw queryError;

        setData({
          users: usersResult.data ?? [],
          events: eventsResult.data ?? [],
          attendance: attendanceResult.data ?? [],
          userCount: userCountResult.count ?? 0,
          eventCount: eventCountResult.count ?? 0,
          attendanceCount: attendanceCountResult.count ?? 0,
        });
      } catch (error: any) {
        const message =
          error?.message || 'Something went wrong while loading the dashboard.';

        setErrorMessage(message);

        if (!verifiedAdmin) {
          setAccessState('error');
        }

        console.error('Admin dashboard error:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id],
  );

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const handleRefresh = () => {
    void loadDashboard(true);
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const renderTab = (
    item: (typeof TABS)[number],
  ) => {
    const active = section === item.key;

    return (
      <Pressable
        key={item.key}
        onPress={() => setSection(item.key)}
        style={[styles.tab, active && styles.activeTab]}
      >
        <Ionicons
          name={item.icon}
          size={17}
          color={active ? '#FFFFFF' : COLORS.textSecondary}
        />
        <Text style={[styles.tabText, active && styles.activeTabText]}>
          {item.label}
        </Text>
      </Pressable>
    );
  };

  const renderStat = (
    title: string,
    value: number,
    icon: keyof typeof Ionicons.glyphMap,
    color: string,
    subtitle: string,
  ) => (
    <View key={title} style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={21} color={color} />
      </View>

      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );

  const renderRow = (
    item: DataRow,
    index: number,
    type: 'user' | 'event' | 'attendance',
  ) => {
    const name =
      type === 'event' ? getEventTitle(item) : getName(item);

    const subtitle =
      type === 'user'
        ? item.email || item.role || 'Registered user'
        : type === 'event'
          ? getDate(
              item.start ||
                item.start_date ||
                item.event_date ||
                item.date,
            )
          : getDate(getTime(item));

    const icon =
      type === 'user'
        ? 'person-outline'
        : type === 'event'
          ? 'calendar-outline'
          : 'checkmark-circle-outline';

    const roleOrStatus =
      type === 'user'
        ? item.role
        : type === 'attendance'
          ? item.status
          : null;

    return (
      <View
        key={String(item.id ?? item.eventId ?? item.event_id ?? index)}
        style={styles.listRow}
      >
        <View style={styles.rowIcon}>
          {type === 'user' && (
            <Text style={styles.initials}>{getInitials(name)}</Text>
          )}

          {type !== 'user' && (
            <Ionicons
              name={icon}
              size={20}
              color={COLORS.primary}
            />
          )}
        </View>

        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        {!!roleOrStatus && (
          <View style={styles.smallBadge}>
            <Text style={styles.smallBadgeText}>
              {String(roleOrStatus)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = (message: string) => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name="file-tray-outline"
          size={27}
          color={COLORS.textSecondary}
        />
      </View>
      <Text style={styles.emptyTitle}>Nothing to show yet</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  const renderSection = () => {
    if (section === 'overview') {
      const recentEvents = [...data.events].reverse().slice(0, 4);
      const recentAttendance = [...data.attendance]
        .reverse()
        .slice(0, 4);

      return (
        <>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Dashboard Overview</Text>
              <Text style={styles.sectionSubtitle}>
                Here&apos;s what&apos;s happening in your system.
              </Text>
            </View>
            <Pressable
              onPress={handleRefresh}
              disabled={refreshing}
              style={styles.refreshButton}
            >
              <Ionicons
                name="refresh-outline"
                size={20}
                color={COLORS.primary}
              />
            </Pressable>
          </View>

          <View style={styles.statsGrid}>
            {renderStat(
              'Total Users',
              data.userCount,
              'people-outline',
              '#B76E9B',
              'Registered accounts',
            )}
            {renderStat(
              'Total Events',
              data.eventCount,
              'calendar-outline',
              '#8973D5',
              'Created events',
            )}
            {renderStat(
              'Attendance',
              data.attendanceCount,
              'checkmark-done-outline',
              '#4C9C83',
              'Recorded entries',
            )}
            {renderStat(
              'Admin Access',
              1,
              'shield-checkmark-outline',
              '#D69B46',
              'Access verified',
            )}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.cardHeading}>
              <View>
                <Text style={styles.cardTitle}>Recent Events</Text>
                <Text style={styles.cardSubtitle}>
                  Latest events in your system
                </Text>
              </View>
              <Pressable onPress={() => setSection('events')}>
                <Text style={styles.viewAll}>View all</Text>
              </Pressable>
            </View>

            {recentEvents.length ? (
              recentEvents.map((item, index) =>
                renderRow(item, index, 'event'),
              )
            ) : (
              renderEmpty('Events will appear here when available.')
            )}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.cardHeading}>
              <View>
                <Text style={styles.cardTitle}>Recent Attendance</Text>
                <Text style={styles.cardSubtitle}>
                  Latest recorded attendance
                </Text>
              </View>
              <Pressable onPress={() => setSection('attendance')}>
                <Text style={styles.viewAll}>View all</Text>
              </Pressable>
            </View>

            {recentAttendance.length ? (
              recentAttendance.map((item, index) =>
                renderRow(item, index, 'attendance'),
              )
            ) : (
              renderEmpty('Attendance records will appear here.')
            )}
          </View>
        </>
      );
    }

    const config = {
      users: {
        title: 'Registered Users',
        subtitle: `${data.userCount} total registered account(s)`,
        items: data.users,
        type: 'user' as const,
        empty: 'Registered users will appear here.',
      },
      events: {
        title: 'Manage Events',
        subtitle: `${data.eventCount} total event(s)`,
        items: data.events,
        type: 'event' as const,
        empty: 'No events are available yet.',
      },
      attendance: {
        title: 'Attendance Records',
        subtitle: `${data.attendanceCount} total record(s)`,
        items: data.attendance,
        type: 'attendance' as const,
        empty: 'Attendance records will appear here.',
      },
    }[section];

    return (
      <View style={styles.sectionCard}>
        <View style={styles.cardHeading}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{config.title}</Text>
            <Text style={styles.cardSubtitle}>{config.subtitle}</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {config.items.length}
            </Text>
          </View>
        </View>

        {config.items.length ? (
          config.items.map((item, index) =>
            renderRow(item, index, config.type),
          )
        ) : (
          renderEmpty(config.empty)
        )}

        {config.items.length === 100 && (
          <Text style={styles.limitNote}>
            Showing up to 100 records. The total count may be higher.
          </Text>
        )}
      </View>
    );
  };

  if (loading && accessState === 'checking') {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.background}
        />
        <View style={styles.loadingIcon}>
          <Ionicons
            name="shield-checkmark-outline"
            size={34}
            color={COLORS.primary}
          />
        </View>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: 16 }}
        />
        <Text style={styles.loadingText}>Loading Admin Dashboard...</Text>
      </SafeAreaView>
    );
  }

  if (accessState === 'denied') {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.deniedIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={36}
            color="#C65C78"
          />
        </View>
        <Text style={styles.deniedTitle}>Access Restricted</Text>
        <Text style={styles.deniedText}>
          This dashboard is only available to authorized administrators.
        </Text>
        <Pressable style={styles.primaryButton} onPress={goBack}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (accessState === 'error' && !data.userCount && !data.eventCount && !data.attendanceCount) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.deniedIcon}>
          <Ionicons
            name="alert-circle-outline"
            size={36}
            color="#C65C78"
          />
        </View>
        <Text style={styles.deniedTitle}>Unable to Load Dashboard</Text>
        <Text style={styles.deniedText}>
          {errorMessage || 'Please check your connection and try again.'}
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => void loadDashboard()}
        >
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </Pressable>
        <Pressable onPress={goBack} style={{ marginTop: 18 }}>
          <Text style={styles.backText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.topBar}>
          <Pressable onPress={goBack} style={styles.backButton}>
            <Ionicons
              name="arrow-back"
              size={21}
              color={COLORS.textPrimary}
            />
          </Pressable>

          <View style={styles.topBarText}>
            <Text style={styles.topBarTitle}>QR Attendance</Text>
            <Text style={styles.topBarSubtitle}>Management Portal</Text>
          </View>

          <Pressable
            onPress={handleRefresh}
            disabled={refreshing}
            style={styles.topRefresh}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons
                name="refresh-outline"
                size={21}
                color={COLORS.primary}
              />
            )}
          </Pressable>
        </View>

        {/* Admin Hero */}
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroShield}>
              <Ionicons
                name="shield-checkmark"
                size={24}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.adminBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.adminBadgeText}>ADMIN ACCESS</Text>
            </View>
          </View>

          <Text style={styles.adminLabel}>ADMINISTRATOR</Text>

          <Text style={styles.heroTitle}>
            Welcome back{'\n'}to your dashboard
          </Text>

          <Text style={styles.heroSubtitle} numberOfLines={1}>
            {user?.email || 'Manage your attendance system'}
          </Text>

          <View style={styles.heroBottom}>
            <View>
              <Text style={styles.heroBottomLabel}>SYSTEM STATUS</Text>
              <Text style={styles.heroBottomValue}>
                <Text style={styles.onlineText}>● </Text>
                Dashboard connected
              </Text>
            </View>

            <Ionicons
              name="analytics-outline"
              size={34}
              color="rgba(255,255,255,0.75)"
            />
          </View>
        </View>

        {/* Navigation */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {TABS.map(renderTab)}
        </ScrollView>

        {!!errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons
              name="alert-circle-outline"
              size={19}
              color="#B94B65"
            />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable onPress={handleRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {refreshing && (
          <View style={styles.refreshingRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.refreshingText}>Updating dashboard...</Text>
          </View>
        )}

        {renderSection()}

        <View style={styles.footer}>
          <Ionicons
            name="heart"
            size={13}
            color={COLORS.primary}
          />
          <Text style={styles.footerText}>
            QR Attendance System
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 28,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  topBarText: {
    flex: 1,
  },

  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  topBarSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  topRefresh: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  hero: {
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    padding: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 17,
  },

  heroShield: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },

  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D8FFE9',
  },

  adminBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  // Gamay na ang ADMINISTRATOR text.
  adminLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 7,
  },

  heroTitle: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
  },

  heroBottom: {
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  heroBottomLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.72)',
  },

  heroBottomValue: {
    marginTop: 5,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  onlineText: {
    color: '#C9FFE0',
  },

  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 20,
  },

  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 15,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  activeTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  tabText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  activeTabText: {
    color: '#FFFFFF',
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  sectionSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },

  refreshButton: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },

  statCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '43%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  statIcon: {
    width: 41,
    height: 41,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  statTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  statValue: {
    marginTop: 5,
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  statSubtitle: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 14,
  },

  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },

  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  cardSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  viewAll: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    paddingLeft: 8,
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 11,
  },

  rowIcon: {
    width: 41,
    height: 41,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  initials: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },

  rowContent: {
    flex: 1,
    minWidth: 0,
  },

  rowTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  rowSubtitle: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  smallBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: 90,
  },

  smallBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },

  countBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 10,
  },

  emptyIcon: {
    width: 53,
    height: 53,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 5,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },

  limitNote: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#FFF0F3',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#F5D1DB',
  },

  errorText: {
    flex: 1,
    fontSize: 11,
    color: '#A13F59',
    lineHeight: 16,
  },

  retryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A13F59',
  },

  refreshingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },

  refreshingText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 12,
  },

  footerText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  loadingIcon: {
    width: 70,
    height: 70,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  deniedIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: '#FFEAF0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  deniedTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  deniedText: {
    marginTop: 9,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 25,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 22,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  backText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});