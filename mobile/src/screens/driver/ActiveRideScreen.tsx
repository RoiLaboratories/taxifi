import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  ScrollView,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { type NavigationProps } from '../../types/navigation';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { mapboxService } from '../../services/mapbox.service';

interface RouteParams {
  rideId: string;
}

interface RideDetails {
  id: string;
  rider_id: string;
  rider_name?: string;
  rider_phone?: string;
  status: 'accepted' | 'in_progress' | 'completed';
  pickup_location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  destination_location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  distance: number;
  duration: number;
  fare: number;
  driver_location?: {
    latitude: number;
    longitude: number;
  };
}

export function ActiveRideScreen() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute();
  const { rideId } = route.params as RouteParams;
  
  const [rideDetails, setRideDetails] = useState<RideDetails | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Toast.show({
            type: 'error',
            text1: 'Permission Error',
            text2: 'Location permission is required for this feature'
          });
          return;
        }
        
        await loadRideDetails();
        await setupLocationTracking();
      } catch (error) {
        console.error('Error initializing map:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to initialize map. Please check your permissions and internet connection.'
        });
      }
    }
    
    initialize();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  async function loadRideDetails() {
    try {
      const { data: ride, error } = await supabase
        .from('rides')
        .select(`
          *,
          rider:rider_id (
            full_name,
            phone_number
          )
        `)
        .eq('id', rideId)
        .single();

      if (error) throw error;

      // Get pickup location address
      const pickupAddress = await mapboxService.reverseGeocode(
        ride.pickup_location.longitude,
        ride.pickup_location.latitude
      );

      // Get destination address
      const destinationAddress = await mapboxService.reverseGeocode(
        ride.destination_location.longitude,
        ride.destination_location.latitude
      );

      // Update ride details with addresses
      setRideDetails({
        ...ride,
        rider_name: ride.rider?.full_name,
        rider_phone: ride.rider?.phone_number,
        pickup_location: {
          ...ride.pickup_location,
          address: pickupAddress.address
        },
        destination_location: {
          ...ride.destination_location,
          address: destinationAddress.address
        }
      });
    } catch (error) {
      console.error('Error loading ride details:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load ride details'
      });
      navigation.goBack();
    }
  }

  async function setupLocationTracking() {
    // For prototype: Use mock location instead of real location tracking
    if (rideDetails) {
      // Set initial mock location near pickup point
      setRideDetails(prev => prev ? {
        ...prev,
        driver_location: {
          latitude: prev.pickup_location.latitude + 0.001,
          longitude: prev.pickup_location.longitude + 0.001,
        }
      } : null);

      // Simulate location updates every 5 seconds
      const mockLocationInterval = setInterval(() => {
        setRideDetails(prev => {
          if (!prev || !prev.driver_location) return prev;
          return {
            ...prev,
            driver_location: {
              latitude: prev.driver_location.latitude + 0.0001,
              longitude: prev.driver_location.longitude + 0.0001,
            }
          };
        });
      }, 5000);

      // Store the interval for cleanup
      setLocationSubscription({ remove: () => clearInterval(mockLocationInterval) } as any);
    }
  }

  async function startRide() {
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'in_progress' })
        .eq('id', rideId);

      if (error) throw error;
      loadRideDetails();
    } catch (error) {
      console.error('Error starting ride:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to start ride'
      });
    }
  }

  async function completeRide() {
    if (!rideDetails) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Ride details not found'
      });
      return;
    }

    try {
      // For prototype: Use destination location instead of current location
      const finalLocation = {
        latitude: rideDetails.destination_location.latitude,
        longitude: rideDetails.destination_location.longitude
      };

      // Use the original destination for final calculations
      const route = await mapboxService.getDirections(
        [rideDetails.pickup_location.longitude, rideDetails.pickup_location.latitude],
        [rideDetails.destination_location.longitude, rideDetails.destination_location.latitude]
      );

      const finalDistance = rideDetails.distance;
      const finalFare = rideDetails.fare;

      const { error } = await supabase
        .from('rides')
        .update({ 
          status: 'completed',
          distance: finalDistance,
          fare: finalFare
        })
        .eq('id', rideId);

      if (error) throw error;

      // Stop location tracking
      if (locationSubscription) {
        locationSubscription.remove();
      }

      // Navigate to ride summary screen
      const pickupAddress = rideDetails.pickup_location.address ?? 'Unknown location';
      const destinationAddress = rideDetails.destination_location.address ?? 'Unknown location';
      
      navigation.navigate('RideSummary', {
        fare: finalFare,
        distance: finalDistance,
        duration: rideDetails.duration,
        pickup: pickupAddress,
        destination: destinationAddress,
        rideId: rideId,
        riderId: rideDetails.rider_id,
        riderName: rideDetails.rider_name ?? 'Rider'
      });
    } catch (error) {
      console.error('Error completing ride:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to complete ride'
      });
    }
  }

  if (!rideDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Active Ride</Text>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: (rideDetails.pickup_location.latitude + rideDetails.destination_location.latitude) / 2,
            longitude: (rideDetails.pickup_location.longitude + rideDetails.destination_location.longitude) / 2,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          {/* Route Line */}
          <Polyline
            coordinates={[
              {
                latitude: rideDetails.pickup_location.latitude,
                longitude: rideDetails.pickup_location.longitude,
              },
              {
                latitude: rideDetails.destination_location.latitude,
                longitude: rideDetails.destination_location.longitude,
              }
            ]}
            strokeColor="#10B981"
            strokeWidth={3}
          />

          {/* Markers */}
          <Marker
            coordinate={{
              latitude: rideDetails.pickup_location.latitude,
              longitude: rideDetails.pickup_location.longitude,
            }}
          >
            <View style={styles.markerContainer}>
              <MaterialIcons name="location-on" size={24} color="#10B981" />
            </View>
          </Marker>

          <Marker
            coordinate={{
              latitude: rideDetails.destination_location.latitude,
              longitude: rideDetails.destination_location.longitude,
            }}
          >
            <View style={styles.markerContainer}>
              <MaterialIcons name="flag" size={24} color="#EF4444" />
            </View>
          </Marker>

          {rideDetails.driver_location && (
            <Marker
              coordinate={{
                latitude: rideDetails.driver_location.latitude,
                longitude: rideDetails.driver_location.longitude,
              }}
            >
              <View style={styles.markerContainer}>
                <MaterialIcons name="directions-car" size={24} color="#10B981" />
              </View>
            </Marker>
          )}
        </MapView>
      </View>

      <View style={styles.locationContainer}>
        <View style={styles.locationItem}>
          <MaterialIcons name="location-on" size={24} color="#10B981" />
          <View style={styles.locationDetails}>
            <Text style={styles.locationLabel}>Pickup</Text>
            <Text style={styles.locationAddress}>
              {rideDetails.pickup_location.address || 'Loading...'}
            </Text>
          </View>
        </View>

        <View style={styles.locationDivider} />

        <View style={styles.locationItem}>
          <MaterialIcons name="flag" size={24} color="#10B981" />
          <View style={styles.locationDetails}>
            <Text style={styles.locationLabel}>Destination</Text>
            <Text style={styles.locationAddress}>
              {rideDetails.destination_location.address || 'Loading...'}
            </Text>
          </View>
        </View>

        <View style={styles.locationDivider} />

        <View style={styles.riderInfoContainer}>
          <View style={styles.riderInfo}>
            <MaterialIcons name="person" size={24} color="#10B981" />
            <View style={styles.riderDetails}>
              <Text style={styles.riderName}>{rideDetails.rider_name || 'Loading...'}</Text>
              <TouchableOpacity
                onPress={() => {
                  if (rideDetails.rider_phone) {
                    Clipboard.setString(rideDetails.rider_phone);
                    Toast.show({
                      type: 'success',
                      text1: 'Success',
                      text2: 'Phone number copied to clipboard'
                    });
                  }
                }}
                style={styles.phoneContainer}
              >
                <Text style={styles.riderPhone}>{rideDetails.rider_phone || 'Loading...'}</Text>
                <MaterialIcons name="content-copy" size={16} color="#9CA3AF" style={styles.copyIcon} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {rideDetails.status === 'in_progress' && (
          <>
            <View style={styles.locationDivider} />
            <View style={styles.rideInfo}>
              <View style={styles.rideInfoItem}>
                <Text style={styles.rideInfoLabel}>Distance</Text>
                <Text style={styles.rideInfoValue}>{rideDetails.distance.toFixed(1)} km</Text>
              </View>
              <View style={styles.rideInfoItem}>
                <Text style={styles.rideInfoLabel}>Duration</Text>
                <Text style={styles.rideInfoValue}>{rideDetails.duration} min</Text>
              </View>
              <View style={styles.rideInfoItem}>
                <Text style={styles.rideInfoLabel}>Fare</Text>
                <Text style={styles.rideInfoValue}>₦{rideDetails.fare.toLocaleString()}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.actionContainer}>
        {rideDetails.status === 'accepted' && (
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={startRide}
          >
            <Text style={styles.actionButtonText}>Start Ride</Text>
          </TouchableOpacity>
        )}

        {rideDetails.status === 'in_progress' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.endRideButton]} 
            onPress={completeRide}
          >
            <Text style={styles.actionButtonText}>End Ride</Text>
          </TouchableOpacity>
        )}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  mapContainer: {
    height: Dimensions.get('window').height * 0.35,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  locationContainer: {
    margin: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationDetails: {
    marginLeft: 12,
    flex: 1,
  },
  locationLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  locationAddress: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 4,
  },
  locationDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 16,
  },
  rideInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rideInfoItem: {
    alignItems: 'center',
  },
  rideInfoLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  rideInfoValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  actionContainer: {
    padding: 16,
  },
  actionButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  endRideButton: {
    backgroundColor: '#EF4444', // Red color for end ride button
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  riderInfoContainer: {
    backgroundColor: 'transparent',
  },
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  riderDetails: {
    marginLeft: 12,
    flex: 1,
  },
  riderName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  riderPhone: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  copyIcon: {
    marginLeft: 8,
  },
});
