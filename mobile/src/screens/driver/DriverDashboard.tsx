import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  RefreshControl,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { type NavigationProps } from '../../types/navigation';

interface EarningsSummary {
  today: number;
  week: number;
  month: number;
}

interface DrivingStats {
  totalRides: number;
  rating: number;
  completionRate: number;
}

export function DriverDashboard() {
  const navigation = useNavigation<NavigationProps>();
  const [isOnline, setIsOnline] = useState(false);
  const [earnings, setEarnings] = useState<EarningsSummary>({
    today: 0,
    week: 0,
    month: 0
  });
  const [stats, setStats] = useState<DrivingStats>({
    totalRides: 0,
    rating: 5.0,
    completionRate: 100
  });
  const [refreshing, setRefreshing] = useState(false);
  const [hasActiveRide, setHasActiveRide] = useState(false);

  useEffect(() => {
    loadDashboardData();
    checkActiveRide();
    subscribeToRideRequests();
  }, []);

  async function loadDashboardData() {
    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) return;

      // Get driver's stats
      const { data: driverData } = await supabase
        .from('users')
        .select('rating')
        .eq('id', profile.user.id)
        .single();

      if (driverData) {
        setStats(prev => ({ ...prev, rating: driverData.rating }));
      }

      // Get earnings data
      // TODO: Implement earnings calculation
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  }

  async function checkActiveRide() {
    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) return;

      const { data: activeRide } = await supabase
        .from('rides')
        .select('id')
        .eq('driver_id', profile.user.id)
        .in('status', ['accepted', 'in_progress'])
        .single();

      setHasActiveRide(!!activeRide);
      if (activeRide) {
        navigation.navigate('ActiveRide', { rideId: activeRide.id });
      }
    } catch (error) {
      console.error('Error checking active ride:', error);
    }
  }

  function subscribeToRideRequests() {
    // TODO: Implement real-time ride request subscription
  }

  async function handleToggleOnline() {
    if (!isOnline) {
      // Request location permission and start location updates
      // TODO: Implement location permission request
    }
    setIsOnline(!isOnline);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.onlineStatus}>
          <Text style={styles.onlineText}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: '#767577', true: '#34C759' }}
            thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : isOnline ? '#FFFFFF' : '#F4F3F4'}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.earningsCard}>
          <Text style={styles.cardTitle}>Today's Earnings</Text>
          <Text style={styles.earningsAmount}>₦{earnings.today.toLocaleString()}</Text>
          <View style={styles.earningsSummary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>This Week</Text>
              <Text style={styles.summaryAmount}>₦{earnings.week.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>This Month</Text>
              <Text style={styles.summaryAmount}>₦{earnings.month.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalRides}</Text>
              <Text style={styles.statLabel}>Total Rides</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.completionRate}%</Text>
              <Text style={styles.statLabel}>Completion</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.driveAndSaveCard}
          onPress={() => navigation.navigate('DriveAndSave')}
        >
          <Text style={styles.cardTitle}>Drive & Save</Text>
          <Text style={styles.cardDescription}>
            Save a percentage of your earnings automatically and earn rewards.
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  onlineText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  earningsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  earningsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6C757D',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6C757D',
  },
  driveAndSaveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardDescription: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 4,
  },
});
