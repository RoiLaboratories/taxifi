import { Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { type RootStackParamList, type DriverStackParamList, type RiderStackParamList, type AuthStackParamList } from '../types/navigation';

// Screens
import { LoadingScreen } from '../screens/loading';
import { AuthScreen, LoginScreen, SignupScreen, EmailVerificationScreen } from '../screens/auth';
import { DriverDashboard } from '../screens/driver/DriverDashboard';
import { ActiveRideScreen } from '../screens/driver/ActiveRideScreen';
import { RideSummaryScreen } from '../screens/driver/RideSummaryScreen';
import { ComingSoonScreen } from '../screens/common/ComingSoonScreen';

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
  const insets = useSafeAreaInsets();
  
  return (
    <DriverTabs.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopWidth: 1,
          borderTopColor: '#374151',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          justifyContent: 'space-between',
        },
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarIconStyle: { marginTop: 4 },
        tabBarLabelStyle: { 
          fontSize: 11,
          marginTop: -4,
        },
      }}
    >
      <DriverTabs.Screen 
        name="Dashboard" 
        component={DriverDashboard}
        options={{
          tabBarLabel: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="home" size={24} color={color} />
          ),
          tabBarItemStyle: {
            flex: 1,
            marginHorizontal: 4,
            minWidth: 65
          }
        }}
      />
      <DriverTabs.Screen 
        name="Earnings" 
        component={ComingSoonScreen}
        options={{
          tabBarLabel: 'Earnings',
          headerShown: true,
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="account-balance-wallet" size={24} color={color} />
          ),
          tabBarItemStyle: {
            flex: 1,
            marginHorizontal: 4,
            minWidth: 65
          }
        }}
      />
      <DriverTabs.Screen 
        name="DriveAndSave" 
        component={ComingSoonScreen}
        options={{
          tabBarLabel: 'Save',
          headerShown: true,
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="savings" size={24} color={color} />
          ),
          tabBarItemStyle: {
            flex: 1,
            marginHorizontal: 4,
            minWidth: 65
          }
        }}
      />
      <DriverTabs.Screen 
        name="Settings" 
        component={ComingSoonScreen}
        options={{
          tabBarLabel: 'Settings',
          headerShown: true,
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="settings" size={24} color={color} />
          ),
          tabBarItemStyle: {
            flex: 1,
            marginHorizontal: 4,
            minWidth: 65
          }
        }}
      />
      <DriverTabs.Screen 
        name="Account" 
        component={ComingSoonScreen}
        options={{
          tabBarLabel: 'Account',
          headerShown: true,
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="person" size={24} color={color} />
          ),
          tabBarItemStyle: {
            flex: 1,
            marginHorizontal: 4,
            minWidth: 65
          }
        }}
      />
      <DriverTabs.Screen 
        name="ComingSoon"
        component={ComingSoonScreen}
        options={{
          tabBarButton: () => null,
          headerShown: true,
          headerTitle: 'Drive & Save',
          headerStyle: {
            backgroundColor: '#000000',
          },
          headerTintColor: '#FFFFFF',
        }}
      />
      <DriverTabs.Screen 
        name="ActiveRide"
        component={ActiveRideScreen}
        options={{
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <DriverTabs.Screen 
        name="RideSummary"
        component={RideSummaryScreen}
        options={{
          tabBarButton: () => null,
          headerShown: false
        }}
      />
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
