import { StyleSheet, View, Text, Animated } from 'react-native';
import { type ReactElement, useEffect, useRef, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { type RootStackParamList } from '../../types/navigation';
import { supabase } from '../../services/supabase';

export function LoadingScreen(): ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const checkAuth = useCallback(async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // No session, navigate to Auth
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth', params: { screen: 'Main' } }],
        });
        return;
      }

      // Get user profile to determine role
      const { data: profile } = await supabase
        .from('users')
        .select('role, status')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        // User exists in auth but not in database
        await supabase.auth.signOut();
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth', params: { screen: 'Main' } }],
        });
        return;
      }

      // Navigate based on user role
      if (profile.role === 'driver') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Driver', params: { screen: 'Dashboard' } }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Rider', params: { screen: 'Home' } }],
        });
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth', params: { screen: 'Main' } }],
      });
    }
  }, [navigation]);

  const createPulse = useCallback(() => {
    return Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);
  }, [scaleAnim]);

  const startAnimationSequence = useCallback(() => {
    // Repeat pulse 5 times
    const pulseArray = Array(5).fill(null).map(() => createPulse());
    
    Animated.sequence([
      // First do 5 pulses
      Animated.sequence(pulseArray),
      // Then do the final roll out animation
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      checkAuth();
    });
  }, [scaleAnim, opacityAnim, checkAuth, createPulse]);

  useEffect(() => {
    // Initial fade in
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const timeout = setTimeout(startAnimationSequence, 500);
    return () => clearTimeout(timeout);
  }, [opacityAnim, startAnimationSequence]);

  return (
    <View style={styles.container}>
      <Animated.Text 
        style={[
          styles.logo,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        TaxiFi
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
