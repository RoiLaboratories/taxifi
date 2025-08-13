import { StyleSheet, View, Text, Animated } from 'react-native';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { type RootStackParamList } from '../../types/navigation';
import * as SplashScreen from 'expo-splash-screen';

export function LoadingScreen(): ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isReady, setIsReady] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    async function prepare() {
      try {
        // Ensure splash screen is hidden
        await SplashScreen.hideAsync();
        setIsReady(true);
      } catch (e) {
        console.warn(e);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth', params: { screen: 'Main' } }],
        });
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [navigation, fadeAnim, isReady]);

  if (!isReady) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Text style={styles.logo}>TaxiFi</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
});
