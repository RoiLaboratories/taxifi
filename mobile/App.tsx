import { type ReactElement, useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Navigation } from './src/navigation';
import Toast from 'react-native-toast-message';

export default function App(): ReactElement {
  const onLayoutRootView = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <Navigation />
      <StatusBar style="auto" />
      <Toast />
    </SafeAreaProvider>
  );
}
