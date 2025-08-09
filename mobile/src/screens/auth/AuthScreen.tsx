import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Dimensions,
  Platform,
  StatusBar,
  Animated,
  ActivityIndicator
} from 'react-native';
import { type ReactElement, useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { type NavigationProps } from '../../types/navigation';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export function AuthScreen(): ReactElement {
  const navigation = useNavigation<NavigationProps>();
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1.1)).current;
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (videoLoaded) {
      // Start fade in animation with spring for more natural feel
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 20,
          friction: 7
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 15,
          friction: 8
        }),
      ]).start();
    }
  }, [videoLoaded, fadeAnim, scaleAnim]);
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {!videoLoaded && !error && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

      {error && (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Animated.View 
        style={[
          styles.backgroundContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <Video
          ref={videoRef}
          source={require('../../assets/videos/auth-bg2.mp4')}
          style={styles.backgroundImage}
          resizeMode={ResizeMode.COVER}
          shouldPlay={true}
          isLooping={true}
          isMuted={true}
          volume={0}
          onLoadStart={() => {
            setVideoLoaded(false);
            setError(null);
          }}
          onLoad={() => setVideoLoaded(true)}
          onError={error => {
            console.warn('Video loading error:', error);
            setError('Unable to play video');
            setVideoLoaded(false);
          }}
          posterSource={require('../../assets/images/auth-bg.jpg')}
        />
        <BlurView 
          intensity={50} 
          style={StyleSheet.absoluteFill}
          tint="dark"
        />
      </Animated.View>

      <LinearGradient
        colors={[
          'rgba(0,0,0,0.4)',
          'rgba(0,0,0,0.6)',
          'rgba(0,0,0,0.85)'
        ]}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.logo}>TaxiFi</Text>
              <Text style={styles.subtitle}>Your Ride, Your Way</Text>
            </View>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.loginButton]} 
                onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
              >
                <Text style={styles.buttonText}>Log In</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.signupButton]}
                onPress={() => navigation.navigate('Auth', { screen: 'Signup' })}
              >
                <Text style={[styles.buttonText, styles.signupButtonText]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Fallback color if image fails to load
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  backgroundImage: {
    width,
    height,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginTop: height * 0.15,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 8,
    opacity: 0.9,
  },
  buttonContainer: {
    gap: 16,
    width: '100%',
    paddingHorizontal: 24,
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
  },
  signupButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  signupButtonText: {
    color: '#FFFFFF',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
});
