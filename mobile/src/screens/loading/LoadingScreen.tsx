import { StyleSheet, View } from 'react-native';
import { type ReactElement, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { type RootStackParamList } from '../../types/navigation';
import { supabase } from '../../services/supabase';

// Configure splash screen to stay visible while we check auth
SplashScreen.preventAutoHideAsync();

export function LoadingScreen(): ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
        await SplashScreen.hideAsync();
        navigation.reset({
          index: 0,
          routes: [{ name: 'Driver', params: { screen: 'Dashboard' } }],
        });
      } else {
        await SplashScreen.hideAsync();
        navigation.reset({
          index: 0,
          routes: [{ name: 'Rider', params: { screen: 'Home' } }],
        });
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      await SplashScreen.hideAsync();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth', params: { screen: 'Main' } }],
      });
    }
  }, [navigation]);

  useEffect(() => {
    // Check auth when component mounts
    checkAuth();
  }, [checkAuth]);

  // Return empty view since splash screen handles the UI
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  }
});
