import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { type ReactElement, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { type NavigationProps } from '../../types/navigation';
import { RoleSelection } from '../../components/RoleSelection';
import { signUp } from '../../services/auth';

type UserRole = 'rider' | 'driver';

interface SignupForm {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole | null;
}

const initialForm: SignupForm = {
  email: '',
  password: '',
  confirmPassword: '',
  fullName: '',
  phoneNumber: '',
  role: null
};

type SignupStep = 'role' | 'details';

export function SignupScreen(): ReactElement {
  const navigation = useNavigation<NavigationProps>();
  const [form, setForm] = useState<SignupForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<SignupStep>('role');

  const validateForm = () => {
    if (!form.email || !form.password || !form.confirmPassword || !form.fullName || !form.phoneNumber || !form.role) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (form.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return false;
    }
    if (!/^\d{11}$/.test(form.phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }
    return true;
  };

  const handleRoleSelect = (role: UserRole) => {
    setForm(prev => ({ ...prev, role }));
    setStep('details');
  };

  const signUpWithEmail = async () => {
    if (!validateForm()) return;
    if (!form.role) {
      Alert.alert('Error', 'Please select a role');
      return;
    }

    setLoading(true);
    try {
      const user = await signUp({
        email: form.email,
        password: form.password,
        full_name: form.fullName,
        phone_number: form.phoneNumber,
        role: form.role // Now TypeScript knows form.role is not null
      });

      // Navigate to appropriate dashboard
      if (user.role === 'driver') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Driver', params: { screen: 'Dashboard' } }]
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Rider', params: { screen: 'Home' } }]
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (step === 'role') {
      return <RoleSelection onRoleSelect={handleRoleSelect} />;
    }

    return (
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#999999"
            value={form.fullName}
            onChangeText={(text) => setForm(prev => ({ ...prev, fullName: text }))}
            autoCapitalize="words"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email address"
            placeholderTextColor="#999999"
            value={form.email}
            onChangeText={(text) => setForm(prev => ({ ...prev, email: text }))}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your phone number"
            placeholderTextColor="#999999"
            value={form.phoneNumber}
            onChangeText={(text) => setForm(prev => ({ ...prev, phoneNumber: text }))}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Create a password"
            placeholderTextColor="#999999"
            value={form.password}
            onChangeText={(text) => setForm(prev => ({ ...prev, password: text }))}
            secureTextEntry
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm your password"
            placeholderTextColor="#999999"
            value={form.confirmPassword}
            onChangeText={(text) => setForm(prev => ({ ...prev, confirmPassword: text }))}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={styles.button}
          onPress={signUpWithEmail} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setStep('role')}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>Change Role</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By signing up, you agree to our{' '}
          <Text style={styles.termsLink}>Terms & Conditions</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              {step === 'role' ? 'Choose your role' : 'Sign up to get started'}
            </Text>
          </View>

          {renderContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  button: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  backButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10
  },
  backButtonText: {
    color: '#666',
    fontSize: 16
  },
  termsText: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 14,
    marginTop: 20
  },
  termsLink: {
    color: '#000000',
    textDecorationLine: 'underline'
  }
});
