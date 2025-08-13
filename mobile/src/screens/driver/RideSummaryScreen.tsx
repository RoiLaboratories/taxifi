import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import type { NavigationProps } from '../../types/navigation';
import { supabase } from '../../services/supabase';
import Toast from 'react-native-toast-message';
import { useState, useEffect } from 'react';

interface RouteParams {
  fare: number;
  distance: number;
  duration: number;
  pickup: string;
  destination: string;
  rideId: string;
  riderId: string;
  riderName: string;
}

export function RideSummaryScreen() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute();
  const { fare, distance, duration, pickup, destination, rideId, riderId } = route.params as RouteParams;
  const [rating, setRating] = useState(5);
  const [riderName, setRiderName] = useState('');
  
  useEffect(() => {
    async function fetchRiderName() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', riderId)
          .single();

        if (error) throw error;
        if (data) {
          setRiderName(data.full_name);
        }
      } catch (error) {
        console.error('Error fetching rider name:', error);
      }
    }

    if (riderId) {
      fetchRiderName();
    }
  }, [riderId]);

  const handleSubmit = async () => {
    try {
      // Submit the rating by updating the rides table
      const { error: ratingError } = await supabase
        .from('rides')
        .update({
          rider_rating: rating
        })
        .eq('id', rideId);

      if (ratingError) throw ratingError;

      // Clear active ride state in the database
      const { error: clearRideError } = await supabase
        .from('drivers')
        .update({ active_ride: null })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      // Navigate back to dashboard
      navigation.reset({
        index: 0,
        routes: [{ 
          name: 'Driver',
          params: {
            screen: 'Dashboard'
          }
        }]
      });
    } catch (error) {
      console.error('Error submitting rating:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to submit rating'
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Ride Summary</Text>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.fareContainer}>
            <Text style={styles.fareLabel}>Total Fare</Text>
            <Text style={styles.fareAmount}>₦{fare.toLocaleString()}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.rideStats}>
            <View style={styles.statItem}>
              <MaterialIcons name="timeline" size={24} color="#10B981" />
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>{distance.toFixed(1)} km</Text>
            </View>

            <View style={styles.statItem}>
              <MaterialIcons name="schedule" size={24} color="#10B981" />
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{duration} min</Text>
            </View>
          </View>
        </View>

        <View style={styles.locationContainer}>
          <View style={styles.locationItem}>
            <MaterialIcons name="location-on" size={24} color="#10B981" />
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationAddress}>{pickup}</Text>
            </View>
          </View>

          <View style={styles.locationDivider} />

          <View style={styles.locationItem}>
            <MaterialIcons name="flag" size={24} color="#10B981" />
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Destination</Text>
              <Text style={styles.locationAddress}>{destination}</Text>
            </View>
          </View>
        </View>

        <View style={styles.ratingContainer}>
          <Text style={styles.ratingTitle}>Rate your ride with {riderName}</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
              >
                <MaterialIcons
                  name={rating >= star ? "star" : "star-outline"}
                  size={40}
                  color={rating >= star ? "#FFD700" : "#9CA3AF"}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.doneButton} 
          onPress={handleSubmit}
        >
          <Text style={styles.doneButtonText}>Submit Rating</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  fareContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  fareLabel: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  fareAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 16,
  },
  rideStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginVertical: 8,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  doneButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ratingContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  ratingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
