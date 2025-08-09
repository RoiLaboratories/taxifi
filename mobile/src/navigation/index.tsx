import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { type RootStackParamList, type DriverStackParamList, type RiderStackParamList, type AuthStackParamList } from '../types/navigation';

// Screens
import { LoadingScreen } from '../screens/loading';
import { AuthScreen, LoginScreen, SignupScreen, EmailVerificationScreen } from '../screens/auth';
import { DriverDashboard } from '../screens/driver/DriverDashboard';

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RiderStack = createNativeStackNavigator<RiderStackParamList>();
const DriverTabs = createBottomTabNavigator<DriverStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <AuthStack.Screen name="Main" component={AuthScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="EmailVerification" component={EmailVerificationScreen} />
    </AuthStack.Navigator>
  );
}

function DriverNavigator() {
  return (
    <DriverTabs.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E9ECEF',
        },
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#6C757D',
      }}
    >
      <DriverTabs.Screen 
        name="Dashboard" 
        component={DriverDashboard}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Text style={{ color }}>🏠</Text>
          ),
        }}
      />
      {/* Add other driver screens here */}
    </DriverTabs.Navigator>
  );
}

export function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Loading"
        screenOptions={{ 
          headerShown: false,
          animation: 'fade'
        }}
      >
        <Stack.Screen 
          name="Loading" 
          component={LoadingScreen}
          options={{
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="Auth" 
          component={AuthNavigator}
          options={{
            headerShown: false,
            animation: 'fade',
          }} 
        />
        <Stack.Screen 
          name="Driver" 
          component={DriverNavigator}
          options={{
            headerShown: false,
            animation: 'fade',
          }} 
        />
        {/* Add RiderNavigator when implementing rider screens */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
