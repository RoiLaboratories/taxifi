import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  RefreshControl,
  Platform
} from 'react-native';
import 'react-native-get-random-values';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import Toast from 'react-native-toast-message';
import { logout } from '../../services/auth';
import { type NavigationProps } from '../../types/navigation';
import { styles } from './styles';
import { mapboxService } from '../../services/mapbox.service';

interface EarningsSummary {
  today: number;
  week: number;
  month: number;
}

interface DrivingStats {
  totalRides: number;
  rating: number;
  completionRate: number;
  driverName?: string;
}

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface RideRequest {
  id: string;
  pickup_location: Location;
  dropoff_location: Location;
  estimated_fare: number;
}

export function DriverDashboard() {
  const navigation = useNavigation<NavigationProps>();
  const isFocused = useIsFocused();
  const [isOnline, setIsOnline] = useState(false);
  const [earnings, setEarnings] = useState<EarningsSummary>({
    today: 0,
    week: 0,
    month: 0
  });
  const [stats, setStats] = useState<DrivingStats>({
    totalRides: 0,
    rating: 5.0,
    completionRate: 100,
    driverName: ''
  });
  const [refreshing, setRefreshing] = useState(false);
  const [hasActiveRide, setHasActiveRide] = useState(false);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);

  // Initial load effect
  useEffect(() => {
    const initialize = async () => {
      await loadDashboardData();
      await checkActiveRide();
      await loadOnlineStatus();
    };
    
    initialize();
    const unsubscribe = subscribeToRideRequests();

    // Set up periodic check for active ride status
    const activeRideCheck = setInterval(() => {
      checkActiveRide();
    }, 5000); // Check every 5 seconds

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(activeRideCheck);
    };
  }, []);

  // Screen focus effect
  useEffect(() => {
    if (isFocused) {
      loadOnlineStatus();
      checkActiveRide();
    }
  }, [isFocused]);

  async function loadOnlineStatus() {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Try to get or create the driver record
      let { data: driver } = await supabase
        .from('drivers')
        .select('is_online')
        .eq('id', user.user.id)
        .single();

      if (!driver) {
        // Create a driver record if it doesn't exist
        const { error: insertError } = await supabase
          .from('drivers')
          .insert([{ id: user.user.id, is_online: false }]);

        if (insertError) throw insertError;
        
        // Fetch the newly created record
        const { data: newDriver } = await supabase
          .from('drivers')
          .select('is_online')
          .eq('id', user.user.id)
          .single();
          
        driver = newDriver;
      }

      if (driver) {
        setIsOnline(driver.is_online || false);
      }
    } catch (error) {
      console.error('Error loading online status:', error);
      // Don't show alert here as this is a background operation
    }
  }

  async function loadDashboardData() {
    try {
      const { data: profile } = await supabase.auth.getUser();
      console.log('User profile:', profile);
      if (!profile.user) return;

      const firstName = profile.user.user_metadata.full_name?.split(' ')[0] || '';
      console.log('First name:', firstName);
      
      // For now, we'll use default values for stats since the columns don't exist yet
      setStats(prevStats => {
        const newStats = {
          ...prevStats,
          rating: 5.0,
          totalRides: 0,
          completionRate: 100,
          driverName: firstName
        };
        console.log('New stats:', newStats);
        return newStats;
      });

      // TODO: Implement earnings calculation from completed rides
    } catch (error) {
      console.error('Error loading dashboard:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load dashboard data'
      });
    }
  }

  async function checkActiveRide() {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      
      // Try to get or create the driver record
      let { data: driver } = await supabase
        .from('drivers')
        .select('active_ride')
        .eq('id', user.user.id)
        .single();

      if (!driver) {
        // Create a driver record if it doesn't exist
        const { error: insertError } = await supabase
          .from('drivers')
          .insert([{ id: user.user.id }]);

        if (insertError) throw insertError;
        
        // Fetch the newly created record
        const { data: newDriver } = await supabase
          .from('drivers')
          .select('active_ride')
          .eq('id', user.user.id)
          .single();
          
        driver = newDriver;
      }

      if (driver?.active_ride) {
        setHasActiveRide(true);
        setActiveRideId(driver.active_ride);
      } else {
        setHasActiveRide(false);
        setActiveRideId(null);
      }
    } catch (error) {
      console.error('Error checking active ride:', error);
      // Don't show alert here as this is a background operation
    }
    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) return;

      const { data: activeRide } = await supabase
        .from('rides')
        .select('id, status')
        .eq('driver_id', profile.user.id)
        .in('status', ['accepted', 'in_progress'])
        .single();

      // Only consider a ride active if it's accepted or in_progress
      const isActive = !!activeRide && ['accepted', 'in_progress'].includes(activeRide.status);
      setHasActiveRide(isActive);
      setActiveRideId(isActive ? activeRide.id : null);
      
      // Only auto-navigate on initial mount, not on refresh, and only when online
      if (isActive && !refreshing && isOnline) {
        navigation.navigate('ActiveRide', { rideId: activeRide.id });
      }
    } catch (error) {
      // If no active ride is found, set hasActiveRide to false
      if (error instanceof Error && error.message.includes('no rows')) {
        setHasActiveRide(false);
        setActiveRideId(null);
      } else {
        console.error('Error checking active ride:', error);
      }
    }
  }

  // For prototype: Use mock location
  async function fetchUserLocation() {
    return {
      latitude: 6.5244,
      longitude: 3.3792
    };
  }

  function subscribeToRideRequests() {
    const user = supabase.auth.getUser();
    if (!user) return;

    const subscription = supabase
      .channel('public:rides')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rides',
          filter: `status=eq.requested`,
        },
        async (payload) => {
          if (isOnline && !hasActiveRide) {
            const location = await fetchUserLocation();
            if (location) {
              const ride = payload.new as RideRequest;
              const distance = await calculateDistanceToPickup(location, ride.pickup_location);
              if (distance <= 5) { // Only show requests within 5km
                handleRideRequest(ride, distance);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  async function calculateDistanceToPickup(
    driverLocation: { latitude: number; longitude: number },
    pickupLocation: any
  ) {
    try {
      const route = await mapboxService.getDirections(
        [driverLocation.longitude, driverLocation.latitude],
        [pickupLocation.longitude, pickupLocation.latitude]
      );
      return parseFloat(route.distance);
    } catch (error) {
      console.error('Error calculating distance:', error);
      return 0;
    }
  }

  async function handleRideRequest(rideData: RideRequest, distance: number) {
    const address = await mapboxService.reverseGeocode(
      rideData.pickup_location.longitude,
      rideData.pickup_location.latitude
    );

    const destinationAddress = await mapboxService.reverseGeocode(
      rideData.dropoff_location.longitude,
      rideData.dropoff_location.latitude
    );

    Toast.show({
      type: 'info',
      text1: 'New Ride Request',
      text2: `Distance to pickup: ${distance.toFixed(1)}km\nPickup: ${address.address}\nDropoff: ${destinationAddress.address}\nEstimated fare: ₦${rideData.estimated_fare}`,
      onPress: () => acceptRide(rideData.id),
      onHide: () => rejectRide(rideData.id),
      visibilityTime: 10000,
      autoHide: true
    });
  }

  async function acceptRide(rideId: string) {
    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) return;

      const location = await fetchUserLocation();
      if (!location) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Unable to get your location'
        });
        return;
      }

      const { error } = await supabase
        .from('rides')
        .update({ 
          status: 'accepted',
          driver_id: profile.user.id
        })
        .eq('id', rideId)
        .eq('status', 'requested'); // Only accept if still in requested state

      if (error) {
        if (error.message.includes('status')) {
          Toast.show({
            type: 'info',
            text1: 'Ride Unavailable',
            text2: 'This ride has already been accepted by another driver'
          });
          return;
        }
        throw error;
      }

      // Create chat room for the ride
      const { data: ride } = await supabase
        .from('rides')
        .select('rider_id')
        .eq('id', rideId)
        .single();

      if (ride) {
        await supabase
          .from('chat_rooms')
          .insert({
            ride_id: rideId,
            driver_id: profile.user.id,
            rider_id: ride.rider_id,
            status: 'active'
          });
      }

      navigation.navigate('ActiveRide', { rideId });
    } catch (error) {
      console.error('Error accepting ride:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to accept ride. Please try again.'
      });
    }
  }

  async function rejectRide(rideId: string) {
    try {
      const { error } = await supabase
        .from('rides')
        .update({ 
          status: 'rejected'
        })
        .eq('id', rideId)
        .eq('status', 'requested'); // Only reject if still in requested state

      if (error) throw error;
    } catch (error) {
      console.error('Error rejecting ride:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to reject ride. Please try again.'
      });
    }
  }

  async function handleToggleOnline() {
    if (hasActiveRide) {
      Toast.show({
        type: 'warning',
        text1: 'Active Ride',
        text2: 'You cannot go offline while on a ride'
      });
      return;
    }

    try {
      const newStatus = !isOnline;
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('drivers')
        .update({ is_online: newStatus })
        .eq('id', user.user.id);

      if (error) throw error;
      setIsOnline(newStatus);
    } catch (error) {
      console.error('Error updating online status:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update online status'
      });
    }
  }

  async function handleDriveAndSave() {
    if (!isOnline) {
      Toast.show({
        type: 'info',
        text1: 'Go Online',
        text2: 'You need to be online to preview or accept rides.'
      });
      return;
    }
    
    console.log('handleDriveAndSave pressed');
    
    try {
      // Generate a valid UUID v4
      const mockRideId = Array.from({ length: 36 }, (_, i) => {
        if (i === 8 || i === 13 || i === 18 || i === 23) return '-';
        if (i === 14) return '4';
        if (i === 19) return '8';
        return Math.floor(Math.random() * 16).toString(16);
      }).join('');
      console.log('Generated mockRideId:', mockRideId);
      
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) {
        console.error('No user profile found');
        return;
      }

      console.log('Fetching a rider for mock ride...');
      const { data: rider, error: riderError } = await supabase
        .from('users')
        .select('id')
        .neq('id', profile.user.id)
        .limit(1)
        .single();

      if (riderError || !rider) {
        console.error('Error fetching rider:', riderError);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'No other users found to test with'
        });
        return;
      }

      console.log('Found rider:', rider.id);
      console.log('Creating mock ride...');

      const { error: rideError } = await supabase
        .from('rides')
        .insert({
          id: mockRideId,
          status: 'accepted',
          driver_id: profile.user.id,
          rider_id: rider.id,
          pickup_location: {
            latitude: 6.5244,
            longitude: 3.3792
          },
          destination_location: {
            latitude: 6.6018,
            longitude: 3.3515
          },
          fare: 2500,
          distance: 15.7,
          duration: 45
        });

      if (rideError) {
        console.error('Error creating mock ride:', rideError);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to create mock ride'
        });
        return;
      }

      console.log('Creating chat room...');
      const { error: chatError } = await supabase
        .from('chat_rooms')
        .insert({
          ride_id: mockRideId,
          driver_id: profile.user.id,
          rider_id: rider.id,
          status: 'active'
        });

      if (chatError) {
        console.error('Error creating chat room:', chatError);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to create chat room'
        });
        return;
      }

      console.log('Mock ride created successfully, navigating...');
      setHasActiveRide(true);
      setActiveRideId(mockRideId);
      navigation.navigate('ActiveRide', { rideId: mockRideId });
    } catch (error) {
      console.error('Unexpected error in handleDriveAndSave:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred. Please try again.'
      });
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth', params: { screen: 'Login' } }],
      });
    } catch (error) {
      console.error('Error logging out:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to log out. Please try again.'
      });
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.onlineStatus}>
              <Text style={styles.onlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
              <Switch
                value={isOnline}
                onValueChange={handleToggleOnline}
                trackColor={{ false: '#4B5563', true: '#10B981' }}
                thumbColor={isOnline ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <MaterialIcons name="logout" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeMessage}>Welcome onboard {stats.driverName}!</Text>
            <Text style={styles.welcomeSubtitle}>Have a safe trip</Text>
          </View>
        </View>

        <View style={styles.earningsCard}>
          <Text style={styles.earningsTitle}>Today's Earnings</Text>
          <Text style={styles.earningsAmount}>₦{earnings.today.toLocaleString()}</Text>
          <View style={styles.earningsDetails}>
            <View style={styles.earningsPeriod}>
              <Text style={styles.periodLabel}>This Week</Text>
              <Text style={styles.periodAmount}>₦{earnings.week.toLocaleString()}</Text>
            </View>
            <View style={styles.earningsPeriod}>
              <Text style={styles.periodLabel}>This Month</Text>
              <Text style={styles.periodAmount}>₦{earnings.month.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcons name="star" size={24} color="#10B981" />
            <Text style={styles.statValue}>{stats.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="directions-car" size={24} color="#10B981" />
            <Text style={styles.statValue}>{stats.totalRides}</Text>
            <Text style={styles.statLabel}>Total Rides</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="check-circle" size={24} color="#10B981" />
            <Text style={styles.statValue}>{stats.completionRate}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
        </View>

        {hasActiveRide ? (
          <TouchableOpacity 
            style={[styles.activeRideButton]} 
            onPress={() => activeRideId && navigation.navigate('ActiveRide', { rideId: activeRideId })}
          >
            <View style={styles.activeRideContent}>
              <View style={styles.activeRideLeft}>
                <MaterialIcons name="local-taxi" size={24} color="#FFFFFF" />
                <View style={styles.activeRideInfo}>
                  <Text style={styles.activeRideTitle}>Active Ride</Text>
                  <Text style={styles.activeRideSubtitle}>Tap to view details</Text>
                </View>
              </View>
              <MaterialIcons name="arrow-forward" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[
              styles.noRideButton,
              !isOnline && styles.disabledButton
            ]} 
            onPress={handleDriveAndSave}
          >
            <MaterialIcons name="local-taxi" size={24} color={isOnline ? "#374151" : "#6B7280"} />
            <Text style={[styles.noRideText, !isOnline && styles.disabledText]}>Preview Active Ride</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
