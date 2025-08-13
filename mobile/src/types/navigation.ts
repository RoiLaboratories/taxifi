import { NavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';

export type RootStackParamList = {
  Loading: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Driver: NavigatorScreenParams<DriverStackParamList>;
  Rider: NavigatorScreenParams<RiderStackParamList>;
};

export type AuthStackParamList = {
  Main: undefined;
  Login: undefined;
  Signup: undefined;
  EmailVerification: {
    email: string;
  };
};

export type DriverStackParamList = {
  Dashboard: undefined;
  ActiveRide: { rideId: string };
  RideSummary: {
    fare: number;
    distance: number;
    duration: number;
    pickup: string;
    destination: string;
    rideId: string;
    riderId: string;
    riderName: string;
  };
  Earnings: undefined;
  DriveAndSave: undefined;
  ComingSoon: undefined;
  Profile: undefined;
  Wallet: undefined;
  Settings: undefined;
  Account: undefined;
};

export type RiderStackParamList = {
  Home: undefined;
  BookRide: undefined;
  RideHistory: undefined;
  ActiveRide: { rideId: string };
  Profile: undefined;
  Wallet: undefined;
  Settings: undefined;
};

export type NavigationProps = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  CompositeNavigationProp<
    NativeStackNavigationProp<AuthStackParamList>,
    CompositeNavigationProp<
      NativeStackNavigationProp<DriverStackParamList>,
      NativeStackNavigationProp<RiderStackParamList>
    >
  >
>;
